import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { SubmissionRepository } from '../repositories/submission.repository.js';

/** A deleted assignment is kept this long, so an admin can trace and restore it. */
const KEEP_DELETED_DAYS = 30;
/** A new assignment outside every section is given this long (it may be mid-creation) before it counts as abandoned. */
const ABANDONED_AFTER_HOURS = 24;
const RUN_EVERY_MS = 60 * 60 * 1000;
const PAGE_SIZE = 200;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Hourly clean-up of assignments nobody needs any more:
 *  - those deleted from every class more than 30 days ago, and
 *  - those never placed in a section (an upload that was never finished) for more than 24 hours.
 * An assignment that has submissions is never removed, whatever happened to its section items.
 */
@Injectable()
export class AssignmentCleanupService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AssignmentCleanupService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly assignmentRepository: AssignmentRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly contentFacade: ContentFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.run(), RUN_EVERY_MS);
    // Never keep the process alive just for the clean-up.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One clean-up pass; safe to call by hand. Returns how many assignments were removed. */
  async run(now: Date = new Date()): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;
    try {
      const expired = await this.contentFacade.purgeDeletedAssignmentItems(
        new Date(now.getTime() - KEEP_DELETED_DAYS * DAY_MS),
      );
      let removed = await this.removeIfUnused(expired);
      removed += await this.removeAbandoned(
        new Date(now.getTime() - ABANDONED_AFTER_HOURS * HOUR_MS),
      );
      if (removed > 0) this.logger.log(`Removed ${removed} unused assignment(s)`);
      return removed;
    } catch (error) {
      this.logger.error('Assignment clean-up failed', error as Error);
      return 0;
    } finally {
      this.isRunning = false;
    }
  }

  /** Walks every assignment older than `cutoff` page by page and removes those no section item points at. */
  private async removeAbandoned(cutoff: Date): Promise<number> {
    let removed = 0;
    let afterId: string | null = null;
    for (;;) {
      const page = await this.assignmentRepository.findCreatedBefore(
        cutoff,
        afterId,
        PAGE_SIZE,
      );
      if (page.length === 0) return removed;
      removed += await this.removeIfUnused(page.map((assignment) => assignment.id));
      afterId = page.at(-1)?.id ?? null;
    }
  }

  /** Removes the assignments that no section item points at and nobody has submitted to. */
  private async removeIfUnused(assignmentIds: string[]): Promise<number> {
    if (assignmentIds.length === 0) return 0;
    const referenced =
      await this.contentFacade.findReferencedAssignmentIds(assignmentIds);
    let removed = 0;
    for (const id of assignmentIds) {
      if (referenced.has(id)) continue;
      if ((await this.submissionRepository.count(id)) > 0) continue;
      const fileIds = await this.assignmentRepository.findFileIds(id);
      await this.assignmentRepository.deleteById(id);
      await this.fileFacade.deleteFiles(fileIds);
      removed += 1;
    }
    return removed;
  }
}