import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, In, Repository } from 'typeorm';
import type { Question } from '../entities/question.entity.js';
import { XesKcMapping } from '../entities/xes-kc-mapping.entity.js';

/**
 * Maps bank KCs and questions onto XES3G5M, fully manual (no embedding / external API):
 *   1. KC -> XES KC route(s): the lecturer searches the XES KC list and picks the matching routes.
 *   2. question -> a XES question of those routes: the least used XES question id is taken, so ids spread out.
 * Env: XES_QUESTIONS_FILE (default ./data/xes3g5m/questions.json), XES_DATA_DIR.
 * A XES KC is identified by its route (first entry of kc_routes in questions.json, e.g. "A----B----C").
 */

const DIR = process.env.XES_DATA_DIR ?? './data/xes3g5m';
const QUESTIONS_FILE = process.env.XES_QUESTIONS_FILE ?? join(DIR, 'questions.json');
const SEARCH_LIMIT = 30;

export interface XesRouteView {
  xesRoute: string;
  /** Leaf name of the route. */
  xesKc: string;
  /** Readable path, e.g. "A › B › C". */
  path: string;
  questionCount: number;
}

export interface KcMappingView {
  kcId: string;
  kcName: string;
  /** Number of bank questions linked to this KC. */
  bankQuestionCount: number;
  /** Confirmed XES routes (empty = not mapped yet). */
  routes: XesRouteView[];
}

export interface BackfillResult {
  mapped: number;
  skipped: number;
  /** Names of the KCs that caused skips because they have no XES route yet. */
  unmappedKcs: string[];
}

const leafOf = (route: string): string => route.split('----').pop() ?? route;
const pathOf = (route: string): string => route.split('----').join(' › ');
const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

@Injectable()
export class XesMappingService implements OnModuleInit {
  private readonly logger = new Logger(XesMappingService.name);
  /** route -> qids (first kc_route of each XES question that has content). */
  private groups = new Map<string, number[]>();
  /** route -> folded text used by the search box. */
  private searchText = new Map<string, string>();

  constructor(
    @InjectRepository(XesKcMapping) private readonly maps: Repository<XesKcMapping>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    if (!existsSync(QUESTIONS_FILE)) {
      this.logger.warn(`${QUESTIONS_FILE} not found: XES mapping disabled.`);
      return;
    }
    const questions = JSON.parse(readFileSync(QUESTIONS_FILE, 'utf8')) as Record<
      string,
      { content?: string; kc_routes?: string[] }
    >;
    for (const [k, v] of Object.entries(questions)) {
      const qid = Number(k);
      const route = v.kc_routes?.[0];
      if (qid < 1 || !v.content || !route) continue;
      this.groups.set(route, [...(this.groups.get(route) ?? []), qid].sort((a, b) => a - b));
    }
    for (const route of this.groups.keys()) this.searchText.set(route, fold(pathOf(route)));
    this.logger.log(`XES loaded: ${this.groups.size} KC routes`);
  }

  get enabled(): boolean {
    return this.groups.size > 0;
  }

  // -- step 1: KC mapping (manual) ---------------------------------------------------------------

  /** Searches XES KC routes by words (all words must appear). Empty query = the routes with most questions. */
  searchRoutes(query: string): XesRouteView[] {
    this.assertEnabled();
    const tokens = fold(query).split(/\s+/).filter(Boolean);
    const out: XesRouteView[] = [];
    for (const [route, text] of this.searchText) {
      if (tokens.every((t) => text.includes(t))) out.push(this.routeView(route));
    }
    return out.sort((a, b) => b.questionCount - a.questionCount).slice(0, SEARCH_LIMIT);
  }

  /** Every KC of the subject with the XES routes the lecturer has chosen for it. */
  async listForSubject(subjectId: string): Promise<KcMappingView[]> {
    const kcs: { id: string; name: string; n: number }[] = await this.dataSource.query(
      `SELECT kc.id, kc.name, COUNT(DISTINCT l.question_id)::int AS n
         FROM knowledge_components kc
         LEFT JOIN question_knowledge_components l ON l.kc_id = kc.id
        WHERE kc.subject_id = $1
        GROUP BY kc.id, kc.name
        ORDER BY kc.name`,
      [subjectId],
    );
    const routesOf = await this.confirmedRoutes(kcs.map((k) => k.id));
    return kcs.map((k) => ({
      kcId: k.id,
      kcName: k.name,
      bankQuestionCount: k.n,
      routes: (routesOf.get(k.id) ?? []).map((r) => this.routeView(r)),
    }));
  }

  /**
   * Replaces the XES routes of a KC (an empty list clears the mapping), then maps the subject's
   * questions that were saved before. A failed backfill never undoes the saved mapping.
   */
  async setRoutes(kcId: string, routes: string[]): Promise<BackfillResult | null> {
    this.assertEnabled();
    const unique = [...new Set(routes)];
    if (unique.some((r) => !this.groups.has(r))) throw new BadRequestException('Route XES không hợp lệ.');

    const [kc]: { subject_id: string }[] = await this.dataSource.query(
      `SELECT subject_id FROM knowledge_components WHERE id = $1`,
      [kcId],
    );
    if (!kc) throw new NotFoundException('Không tìm thấy KC.');

    await this.dataSource.transaction(async (m) => {
      await m.delete(XesKcMapping, { kcId });
      if (unique.length === 0) return;
      await m.save(
        XesKcMapping,
        unique.map((r) => m.create(XesKcMapping, { kcId, xesRoute: r, score: 0, status: 'CONFIRMED' })),
      );
    });

    if (unique.length === 0) return null;
    try {
      return await this.backfill(kc.subject_id);
    } catch (err) {
      this.logger.warn(`Backfill after save skipped: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Confirmed XES KC routes of the given KCs, keyed by kcId. */
  async confirmedRoutes(kcIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (kcIds.length === 0) return out;
    const rows = await this.maps.find({ where: { kcId: In(kcIds), status: 'CONFIRMED' } });
    for (const r of rows) out.set(r.kcId, [...(out.get(r.kcId) ?? []), r.xesRoute]);
    return out;
  }

  // -- step 2: question mapping ------------------------------------------------------------------

  /** Sets xesQuestionId on each question (left null when its KCs have no XES route). */
  async assign(items: { question: Question; kcIds: string[] }[]): Promise<void> {
    if (!this.enabled || items.length === 0) return;
    try {
      const ids = await this.pick(items.map((i) => i.kcIds));
      items.forEach((it, i) => (it.question.xesQuestionId = ids[i]));
    } catch (err) {
      this.logger.warn(`XES mapping skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Maps questions that were saved before their KCs had a XES route. */
  async backfill(subjectId: string): Promise<BackfillResult> {
    this.assertEnabled();
    const rows: { id: string; kc_ids: string[] }[] = await this.dataSource.query(
      `SELECT q.id, array_agg(l.kc_id) AS kc_ids
         FROM questions q JOIN question_knowledge_components l ON l.question_id = q.id
        WHERE q.subject_id = $1 AND q.xes_question_id IS NULL
        GROUP BY q.id`,
      [subjectId],
    );
    const ids = await this.pick(rows.map((r) => r.kc_ids));
    let mapped = 0;
    const skippedKcIds = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      if (ids[i] === null) {
        rows[i].kc_ids.forEach((k) => skippedKcIds.add(k));
        continue;
      }
      await this.dataSource.query(`UPDATE questions SET xes_question_id = $1 WHERE id = $2`, [ids[i], rows[i].id]);
      mapped++;
    }

    let unmappedKcs: string[] = [];
    if (skippedKcIds.size > 0) {
      const routesOf = await this.confirmedRoutes([...skippedKcIds]);
      const names: { name: string }[] = await this.dataSource.query(
        `SELECT name FROM knowledge_components WHERE id = ANY($1) ORDER BY name`,
        [[...skippedKcIds].filter((k) => !routesOf.has(k))],
      );
      unmappedKcs = names.map((n) => n.name);
    }
    return { mapped, skipped: rows.length - mapped, unmappedKcs };
  }

  /** For each question (given as its KC ids): the least used XES question among its KCs' routes, or null. */
  private async pick(kcIdsPerItem: string[][]): Promise<(number | null)[]> {
    const routesOf = await this.confirmedRoutes([...new Set(kcIdsPerItem.flat())]);
    const used = new Map<number, number>(
      (
        await this.dataSource.query(
          `SELECT xes_question_id AS id, COUNT(*)::int AS n FROM questions
            WHERE xes_question_id IS NOT NULL GROUP BY xes_question_id`,
        )
      ).map((r: { id: number; n: number }) => [r.id, r.n]),
    );

    return kcIdsPerItem.map((kcIds) => {
      const cands = [...new Set(kcIds.flatMap((k) => (routesOf.get(k) ?? []).flatMap((r) => this.groups.get(r) ?? [])))];
      if (cands.length === 0) return null;
      const best = cands.reduce((b, c) => ((used.get(c) ?? 0) < (used.get(b) ?? 0) ? c : b));
      used.set(best, (used.get(best) ?? 0) + 1);
      return best;
    });
  }

  private routeView(route: string): XesRouteView {
    return {
      xesRoute: route,
      xesKc: leafOf(route),
      path: pathOf(route),
      questionCount: this.groups.get(route)?.length ?? 0,
    };
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new BadRequestException('Chưa cấu hình dữ liệu XES3G5M (questions.json).');
  }
}