import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, In, Repository } from 'typeorm';
import type { Question } from '../entities/question.entity.js';
import { XesKcMapping } from '../entities/xes-kc-mapping.entity.js';

/**
 * Maps bank KCs and questions onto XES3G5M, in two steps:
 *   1. KC -> XES KC route (embedding of the names, suggested then CONFIRMED by a lecturer)
 *   2. question -> a XES question of a confirmed route (embedding of the question text)
 * Env: XES_QUESTIONS_FILE (default ./data/xes3g5m/questions.json), XES_DATA_DIR, GEMINI_API_KEY.
 */

const DIR = process.env.XES_DATA_DIR ?? './data/xes3g5m';
const QUESTIONS_FILE = process.env.XES_QUESTIONS_FILE ?? join(DIR, 'questions.json');
const ROUTE_CACHE_FILE = join(DIR, 'xes-kc-embeddings.json');

const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIM = 256;
const EMBED_BATCH = 100;
const MAX_TEXT = 1000;
const SUGGESTIONS_PER_KC = 3;
const TOP_K = 3; // among the K most similar questions of the KC, take the least used XES id

export interface KcSuggestionView {
  kcId: string;
  kcName: string;
  xesRoute: string;
  xesKc: string; // leaf name of the route
  score: number;
  status: string;
  questionCount: number;
}

const leafOf = (route: string): string => route.split('----').pop() ?? route;
const labelOf = (route: string): string => route.split('----').slice(-2).join(' - ');
const clip = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);

const normalise = (v: number[]): number[] => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};
const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * b[i], 0);

@Injectable()
export class XesMappingService implements OnModuleInit {
  private readonly logger = new Logger(XesMappingService.name);
  /** route -> qids, same grouping as the demo (first kc_route of each question that has content). */
  private groups = new Map<string, number[]>();
  private content = new Map<number, string>();
  private cache = new Map<string, number[]>(); // text -> embedding (XES texts only)

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
      this.content.set(qid, clip(v.content));
      this.groups.set(route, [...(this.groups.get(route) ?? []), qid].sort((a, b) => a - b));
    }
    this.logger.log(`XES loaded: ${this.content.size} questions in ${this.groups.size} KC routes`);
  }

  get enabled(): boolean {
    return this.groups.size > 0;
  }

  // -- step 1: KC mapping ------------------------------------------------------------------------

  /** Suggests the closest XES KCs for each KC of the subject. Never overwrites CONFIRMED rows. */
  async suggestForSubject(subjectId: string): Promise<KcSuggestionView[]> {
    this.assertEnabled();
    const kcs: { id: string; name: string }[] = await this.dataSource.query(
      `SELECT id, name FROM knowledge_components WHERE subject_id = $1`,
      [subjectId],
    );
    if (kcs.length === 0) return [];

    const routes = [...this.groups.keys()];
    const routeVecs = await this.routeVectors(routes);
    const kcVecs = await this.embed(kcs.map((k) => k.name));

    const confirmed = new Set(
      (await this.maps.find({ where: { kcId: In(kcs.map((k) => k.id)), status: 'CONFIRMED' } })).map(
        (m) => m.kcId,
      ),
    );
    const rows: XesKcMapping[] = [];
    kcs.forEach((kc, i) => {
      if (confirmed.has(kc.id)) return;
      routes
        .map((r, j) => ({ r, score: dot(kcVecs[i], routeVecs[j]) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, SUGGESTIONS_PER_KC)
        .forEach((s) =>
          rows.push(this.maps.create({ kcId: kc.id, xesRoute: s.r, score: s.score, status: 'SUGGESTED' })),
        );
    });
    await this.dataSource.transaction(async (m) => {
      const ids = kcs.filter((k) => !confirmed.has(k.id)).map((k) => k.id);
      if (ids.length) await m.delete(XesKcMapping, { kcId: In(ids), status: 'SUGGESTED' });
      await m.save(XesKcMapping, rows);
    });
    return this.listForSubject(subjectId);
  }

  async listForSubject(subjectId: string): Promise<KcSuggestionView[]> {
    const rows: { kc_id: string; name: string; xes_route: string; score: number; status: string }[] =
      await this.dataSource.query(
        `SELECT m.kc_id, kc.name, m.xes_route, m.score, m.status
           FROM kc_xes_mappings m JOIN knowledge_components kc ON kc.id = m.kc_id
          WHERE kc.subject_id = $1 ORDER BY kc.name, m.score DESC`,
        [subjectId],
      );
    return rows.map((r) => ({
      kcId: r.kc_id,
      kcName: r.name,
      xesRoute: r.xes_route,
      xesKc: leafOf(r.xes_route),
      score: r.score,
      status: r.status,
      questionCount: this.groups.get(r.xes_route)?.length ?? 0,
    }));
  }

  /** The lecturer picks the XES KC route(s) that really match this KC. */
  async confirm(kcId: string, routes: string[]): Promise<void> {
    this.assertEnabled();
    const bad = routes.filter((r) => !this.groups.has(r));
    if (routes.length === 0 || bad.length > 0) {
      throw new BadRequestException('Route XES không hợp lệ.');
    }
    await this.dataSource.transaction(async (m) => {
      const existing = await m.find(XesKcMapping, { where: { kcId } });
      const score = new Map(existing.map((e) => [e.xesRoute, e.score]));
      await m.delete(XesKcMapping, { kcId });
      await m.save(
        XesKcMapping,
        routes.map((r) => m.create(XesKcMapping, { kcId, xesRoute: r, score: score.get(r) ?? 0, status: 'CONFIRMED' })),
      );
    });
  }

  // -- step 2: question mapping ------------------------------------------------------------------

  /** Sets xesQuestionId on each question (left null when its KCs have no confirmed mapping). */
  async assign(items: { question: Question; kcIds: string[] }[]): Promise<void> {
    if (!this.enabled || items.length === 0) return;
    try {
      const ids = await this.pick(items.map((i) => ({ text: i.question.questionText, kcIds: i.kcIds })));
      items.forEach((it, i) => (it.question.xesQuestionId = ids[i]));
    } catch (err) {
      this.logger.warn(`XES mapping skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Maps questions that were saved before their KCs were confirmed. */
  async backfill(subjectId: string): Promise<{ mapped: number; skipped: number }> {
    this.assertEnabled();
    const rows: { id: string; question_text: string; kc_ids: string[] }[] = await this.dataSource.query(
      `SELECT q.id, q.question_text, array_agg(l.kc_id) AS kc_ids
         FROM questions q JOIN question_knowledge_components l ON l.question_id = q.id
        WHERE q.subject_id = $1 AND q.xes_question_id IS NULL
        GROUP BY q.id, q.question_text`,
      [subjectId],
    );
    const ids = await this.pick(rows.map((r) => ({ text: r.question_text, kcIds: r.kc_ids })));
    let mapped = 0;
    for (let i = 0; i < rows.length; i++) {
      if (ids[i] === null) continue;
      await this.dataSource.query(`UPDATE questions SET xes_question_id = $1 WHERE id = $2`, [ids[i], rows[i].id]);
      mapped++;
    }
    return { mapped, skipped: rows.length - mapped };
  }

  private async pick(items: { text: string; kcIds: string[] }[]): Promise<(number | null)[]> {
    const kcIds = [...new Set(items.flatMap((i) => i.kcIds))];
    const confirmed = kcIds.length
      ? await this.maps.find({ where: { kcId: In(kcIds), status: 'CONFIRMED' } })
      : [];
    const routesOf = new Map<string, string[]>();
    for (const m of confirmed) routesOf.set(m.kcId, [...(routesOf.get(m.kcId) ?? []), m.xesRoute]);

    const used = new Map<number, number>(
      (
        await this.dataSource.query(
          `SELECT xes_question_id AS id, COUNT(*)::int AS n FROM questions
            WHERE xes_question_id IS NOT NULL GROUP BY xes_question_id`,
        )
      ).map((r: { id: number; n: number }) => [r.id, r.n]),
    );

    // candidates per item = XES questions of every confirmed route of every KC of the question
    const cands = items.map((it) => [
      ...new Set(it.kcIds.flatMap((k) => (routesOf.get(k) ?? []).flatMap((r) => this.groups.get(r) ?? []))),
    ]);

    // embed only what is needed: the texts of questions with more than one candidate, and those candidates
    const needVec = items.map((_, i) => cands[i].length > 1);
    let qVecs: number[][] = [];
    try {
      const texts = items.filter((_, i) => needVec[i]).map((it) => clip(it.text));
      qVecs = texts.length ? await this.embed(texts, false) : [];
      await this.embed([...new Set(cands.flatMap((c, i) => (needVec[i] ? c : [])))].map((q) => this.content.get(q)!));
    } catch (err) {
      this.logger.warn(`Embedding failed, picking the least used id instead: ${String(err)}`);
      qVecs = [];
    }

    let v = 0;
    return items.map((_, i) => {
      const list = cands[i];
      if (list.length === 0) return null;
      const queryVec = needVec[i] ? qVecs[v++] : undefined;
      const ranked = list
        .map((id) => {
          const cv = this.cache.get(this.content.get(id)!);
          return { id, score: queryVec && cv ? dot(queryVec, cv) : 0 };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, queryVec ? TOP_K : list.length);
      const best = ranked.reduce((b, c) => ((used.get(c.id) ?? 0) < (used.get(b.id) ?? 0) ? c : b));
      used.set(best.id, (used.get(best.id) ?? 0) + 1);
      return best.id;
    });
  }

  // -- embeddings --------------------------------------------------------------------------------

  /** Route embeddings are the same on every run, so they are cached on disk. */
  private async routeVectors(routes: string[]): Promise<number[][]> {
    const disk: Record<string, number[]> = existsSync(ROUTE_CACHE_FILE)
      ? JSON.parse(readFileSync(ROUTE_CACHE_FILE, 'utf8'))
      : {};
    const missing = routes.filter((r) => !disk[r]);
    if (missing.length) {
      const vecs = await this.embed(missing.map(labelOf), false);
      missing.forEach((r, i) => (disk[r] = vecs[i]));
      writeFileSync(ROUTE_CACHE_FILE, JSON.stringify(disk));
    }
    return routes.map((r) => disk[r]);
  }

  /** Texts are cached by default (XES content is reused); pass cache=false for one-off texts. */
  private async embed(texts: string[], cache = true): Promise<number[][]> {
    const local = new Map<string, number[]>();
    const lookup = (t: string) => this.cache.get(t) ?? local.get(t);
    const need = [...new Set(texts)].filter((t) => !lookup(t));

    for (let i = 0; i < need.length; i += EMBED_BATCH) {
      const slice = need.slice(i, i + EMBED_BATCH);
      const vecs = await this.callGemini(slice);
      slice.forEach((t, j) => (cache ? this.cache : local).set(t, vecs[j]));
    }
    return texts.map((t) => lookup(t)!);
  }

  private async callGemini(texts: string[]): Promise<number[][]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY missing');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${EMBED_MODEL}`,
            content: { parts: [{ text }] },
            taskType: 'SEMANTIC_SIMILARITY',
            outputDimensionality: EMBED_DIM,
          })),
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`embedding HTTP ${res.status}`);
    const json = (await res.json()) as { embeddings: { values: number[] }[] };
    return json.embeddings.map((e) => normalise(e.values));
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new BadRequestException('Chưa cấu hình dữ liệu XES3G5M (questions.json).');
  }
}