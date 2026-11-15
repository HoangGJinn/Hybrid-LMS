import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassAssignmentService } from '../services/class-assignment.service.js';
import type { ClassDocumentService } from '../services/class-document.service.js';
import type { ClassExamService } from '../services/class-exam.service.js';
import { ContentFacade } from './content.facade.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ContentFacade', () => {
  let facade: ContentFacade;
  let classDocumentService: Record<keyof ClassDocumentService, Mock>;
  let classAssignmentService: Record<keyof ClassAssignmentService, Mock>;
  let classExamService: Record<keyof ClassExamService, Mock>;

  beforeEach(() => {
    classDocumentService = {
      getDocumentIds: vi.fn().mockResolvedValue(['d-1']),
      isDocumentInClass: vi.fn().mockResolvedValue(true),
      getSeenDocumentIds: vi.fn().mockResolvedValue(new Set(['d-1'])),
      markSeen: vi.fn().mockResolvedValue(undefined),
      removeDocument: vi.fn().mockResolvedValue(1),
      isDocumentReferenced: vi.fn().mockResolvedValue(false),
    };
    classAssignmentService = {
      findAssignmentsByClasses: vi
        .fn()
        .mockResolvedValue([{ classId: 'c-1', assignmentId: 'a-1' }]),
      isAssignmentInClass: vi.fn().mockResolvedValue(true),
      removeAssignment: vi.fn().mockResolvedValue(1),
      isAssignmentReferenced: vi.fn().mockResolvedValue(true),
    };
    classExamService = {
      findExamsByClasses: vi
        .fn()
        .mockResolvedValue([{ classId: 'c-1', examId: 'e-1' }]),
      isExamInClass: vi.fn().mockResolvedValue(true),
      removeExam: vi.fn().mockResolvedValue(2),
      isExamReferenced: vi.fn().mockResolvedValue(false),
    };

    facade = new ContentFacade(
      classDocumentService as unknown as ClassDocumentService,
      classAssignmentService as unknown as ClassAssignmentService,
      classExamService as unknown as ClassExamService,
    );
  });

  it('delegates document, assignment, and exam facade methods', async () => {
    expect(await facade.getDocumentIdsInClass('c-1')).toEqual(['d-1']);
    expect(await facade.isDocumentInClass('c-1', 'd-1')).toBe(true);
    expect(await facade.getSeenDocumentIds('c-1', 's-1')).toEqual(
      new Set(['d-1']),
    );
    await facade.markDocumentSeen('c-1', 'd-1', 's-1');
    expect(await facade.removeDocumentFromClass('c-1', 'd-1')).toBe(1);
    expect(await facade.isDocumentReferenced('d-1')).toBe(false);

    expect(await facade.findAssignmentsByClasses(['c-1'])).toEqual([
      { classId: 'c-1', assignmentId: 'a-1' },
    ]);
    expect(await facade.isAssignmentInClass('c-1', 'a-1')).toBe(true);
    expect(await facade.removeAssignmentFromClass('c-1', 'a-1')).toBe(1);
    expect(await facade.isAssignmentReferenced('a-1')).toBe(true);

    expect(await facade.findExamsByClasses(['c-1'])).toEqual([
      { classId: 'c-1', examId: 'e-1' },
    ]);
    expect(await facade.isExamInClass('c-1', 'e-1')).toBe(true);
    expect(await facade.removeExamFromClass('c-1', 'e-1')).toBe(2);
    expect(await facade.isExamReferenced('e-1')).toBe(false);
  });
});

