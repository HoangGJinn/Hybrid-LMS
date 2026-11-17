import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import type { AssignmentRepository } from '../repositories/assignment.repository.js';
import type { SubmissionRepository } from '../repositories/submission.repository.js';
import { AssignmentCleanupService } from './assignment-cleanup.service.js';

type Mock = ReturnType<typeof vi.fn>;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const PAGE_SIZE = 200;
const NOW = new Date('2026-11-17T08:00:00Z');

describe('AssignmentCleanupService', () => {
  let assignmentRepo: {
    findCreatedBefore: Mock;
    findFileIds: Mock;
    deleteById: Mock;
  };
  let submissionRepo: { count: Mock };
  let contentFacade: {
    purgeDeletedAssignmentItems: Mock;
    findReferencedAssignmentIds: Mock;
  };
  let fileFacade: { deleteFiles: Mock };
  let service: AssignmentCleanupService;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    assignmentRepo = {
      findCreatedBefore: vi.fn().mockResolvedValue([]),
      findFileIds: vi.fn().mockResolvedValue([]),
      deleteById: vi.fn().mockResolvedValue(undefined),
    };
    submissionRepo = { count: vi.fn().mockResolvedValue(0) };
    contentFacade = {
      purgeDeletedAssignmentItems: vi.fn().mockResolvedValue([]),
      findReferencedAssignmentIds: vi.fn().mockResolvedValue(new Set<string>()),
    };
    fileFacade = { deleteFiles: vi.fn().mockResolvedValue(undefined) };
    service = new AssignmentCleanupService(
      assignmentRepo as unknown as AssignmentRepository,
      submissionRepo as unknown as SubmissionRepository,
      contentFacade as unknown as ContentFacade,
      fileFacade as unknown as FileFacade,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('run', () => {
    it('purges items deleted 30 days ago and looks for assignments abandoned 24 hours ago', async () => {
      await expect(service.run(NOW)).resolves.toBe(0);

      expect(contentFacade.purgeDeletedAssignmentItems).toHaveBeenCalledWith(
        new Date(NOW.getTime() - 30 * DAY_MS),
      );
      expect(assignmentRepo.findCreatedBefore).toHaveBeenCalledWith(
        new Date(NOW.getTime() - 24 * HOUR_MS),
        null,
        PAGE_SIZE,
      );
    });

    it('uses the current time when no date is given', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);

      await service.run();

      expect(contentFacade.purgeDeletedAssignmentItems).toHaveBeenCalledWith(
        new Date(NOW.getTime() - 30 * DAY_MS),
      );
    });

    it('does not check references when nothing expired', async () => {
      await service.run(NOW);

      expect(contentFacade.findReferencedAssignmentIds).not.toHaveBeenCalled();
      expect(assignmentRepo.deleteById).not.toHaveBeenCalled();
    });

    describe('expired assignments', () => {
      it('removes an unreferenced assignment without submissions, then its files', async () => {
        contentFacade.purgeDeletedAssignmentItems.mockResolvedValue(['a-1']);
        assignmentRepo.findFileIds.mockResolvedValue(['f-1', 'f-2']);

        await expect(service.run(NOW)).resolves.toBe(1);

        expect(contentFacade.findReferencedAssignmentIds).toHaveBeenCalledWith(['a-1']);
        expect(submissionRepo.count).toHaveBeenCalledWith('a-1');
        expect(assignmentRepo.deleteById).toHaveBeenCalledWith('a-1');
        expect(fileFacade.deleteFiles).toHaveBeenCalledWith(['f-1', 'f-2']);
        expect(assignmentRepo.deleteById.mock.invocationCallOrder[0]).toBeLessThan(
          fileFacade.deleteFiles.mock.invocationCallOrder[0],
        );
      });

      it('keeps an assignment that a section item still points at', async () => {
        contentFacade.purgeDeletedAssignmentItems.mockResolvedValue(['a-1', 'a-2']);
        contentFacade.findReferencedAssignmentIds.mockResolvedValue(new Set(['a-1']));

        await expect(service.run(NOW)).resolves.toBe(1);

        expect(assignmentRepo.deleteById).toHaveBeenCalledTimes(1);
        expect(assignmentRepo.deleteById).toHaveBeenCalledWith('a-2');
      });

      it('never removes an assignment that has submissions', async () => {
        contentFacade.purgeDeletedAssignmentItems.mockResolvedValue(['a-1', 'a-2']);
        submissionRepo.count.mockImplementation((id: string) =>
          Promise.resolve(id === 'a-1' ? 3 : 0),
        );

        await expect(service.run(NOW)).resolves.toBe(1);

        expect(assignmentRepo.deleteById).not.toHaveBeenCalledWith('a-1');
        expect(assignmentRepo.deleteById).toHaveBeenCalledWith('a-2');
        expect(fileFacade.deleteFiles).toHaveBeenCalledTimes(1);
      });
    });

    describe('abandoned assignments', () => {
      it('removes an old assignment that no section item points at', async () => {
        assignmentRepo.findCreatedBefore
          .mockResolvedValueOnce([{ id: 'a-1' }])
          .mockResolvedValueOnce([]);
        assignmentRepo.findFileIds.mockResolvedValue(['f-1']);

        await expect(service.run(NOW)).resolves.toBe(1);

        expect(assignmentRepo.deleteById).toHaveBeenCalledWith('a-1');
        expect(fileFacade.deleteFiles).toHaveBeenCalledWith(['f-1']);
      });

      it('keeps an old assignment that is placed in a section or has submissions', async () => {
        assignmentRepo.findCreatedBefore
          .mockResolvedValueOnce([{ id: 'a-1' }, { id: 'a-2' }])
          .mockResolvedValueOnce([]);
        contentFacade.findReferencedAssignmentIds.mockResolvedValue(new Set(['a-1']));
        submissionRepo.count.mockResolvedValue(2);

        await expect(service.run(NOW)).resolves.toBe(0);

        expect(assignmentRepo.deleteById).not.toHaveBeenCalled();
        expect(fileFacade.deleteFiles).not.toHaveBeenCalled();
      });

      it('walks the assignments page by page, continuing after the last id', async () => {
        assignmentRepo.findCreatedBefore
          .mockResolvedValueOnce([{ id: 'a-1' }, { id: 'a-2' }])
          .mockResolvedValueOnce([{ id: 'a-3' }])
          .mockResolvedValueOnce([]);
        const cutoff = new Date(NOW.getTime() - 24 * HOUR_MS);

        await expect(service.run(NOW)).resolves.toBe(3);

        expect(assignmentRepo.findCreatedBefore).toHaveBeenNthCalledWith(
          1,
          cutoff,
          null,
          PAGE_SIZE,
        );
        expect(assignmentRepo.findCreatedBefore).toHaveBeenNthCalledWith(
          2,
          cutoff,
          'a-2',
          PAGE_SIZE,
        );
        expect(assignmentRepo.findCreatedBefore).toHaveBeenNthCalledWith(
          3,
          cutoff,
          'a-3',
          PAGE_SIZE,
        );
        expect(contentFacade.findReferencedAssignmentIds).toHaveBeenNthCalledWith(1, [
          'a-1',
          'a-2',
        ]);
        expect(contentFacade.findReferencedAssignmentIds).toHaveBeenNthCalledWith(2, ['a-3']);
      });
    });

    it('adds up expired and abandoned removals and logs the total', async () => {
      contentFacade.purgeDeletedAssignmentItems.mockResolvedValue(['a-1']);
      assignmentRepo.findCreatedBefore
        .mockResolvedValueOnce([{ id: 'a-2' }])
        .mockResolvedValueOnce([]);

      await expect(service.run(NOW)).resolves.toBe(2);

      expect(logSpy).toHaveBeenCalledWith('Removed 2 unused assignment(s)');
    });

    it('does not log when nothing was removed', async () => {
      await service.run(NOW);

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('logs the failure and returns 0 instead of throwing', async () => {
      const error = new Error('db down');
      contentFacade.purgeDeletedAssignmentItems.mockRejectedValue(error);

      await expect(service.run(NOW)).resolves.toBe(0);

      expect(errorSpy).toHaveBeenCalledWith('Assignment clean-up failed', error);
    });

    it('can run again after a failed pass', async () => {
      contentFacade.purgeDeletedAssignmentItems
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce(['a-1']);

      await service.run(NOW);
      await expect(service.run(NOW)).resolves.toBe(1);
    });

    it('skips a pass that starts while another one is still running', async () => {
      let release: (ids: string[]) => void = () => undefined;
      contentFacade.purgeDeletedAssignmentItems.mockReturnValueOnce(
        new Promise<string[]>((resolve) => {
          release = resolve;
        }),
      );

      const first = service.run(NOW);
      await expect(service.run(NOW)).resolves.toBe(0);
      expect(contentFacade.purgeDeletedAssignmentItems).toHaveBeenCalledTimes(1);

      release([]);
      await expect(first).resolves.toBe(0);
      await expect(service.run(NOW)).resolves.toBe(0);
      expect(contentFacade.purgeDeletedAssignmentItems).toHaveBeenCalledTimes(2);
    });
  });

  describe('lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('runs the clean-up every hour once the application has started', () => {
      const run = vi.spyOn(service, 'run').mockResolvedValue(0);

      service.onApplicationBootstrap();
      vi.advanceTimersByTime(HOUR_MS - 1);
      expect(run).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(run).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(HOUR_MS);
      expect(run).toHaveBeenCalledTimes(2);

      service.onModuleDestroy();
    });

    it('stops running after the module is destroyed', () => {
      const run = vi.spyOn(service, 'run').mockResolvedValue(0);

      service.onApplicationBootstrap();
      service.onModuleDestroy();
      vi.advanceTimersByTime(3 * HOUR_MS);

      expect(run).not.toHaveBeenCalled();
    });

    it('can be destroyed without having been started', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});