import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemScope } from '../repositories/item-filters.js';
import type { ClassAssignmentService } from '../services/class-assignment.service.js';
import type { ClassDocumentService } from '../services/class-document.service.js';
import type { ClassExamService } from '../services/class-exam.service.js';
import { ContentFacade } from './content.facade.js';

type Mock = ReturnType<typeof vi.fn>;

const scope = { role: 'student' } as unknown as ItemScope;

describe('ContentFacade', () => {
  let facade: ContentFacade;
  let classDocumentService: {
    getDocumentIds: Mock;
    isDocumentInClass: Mock;
    getSeenDocumentIds: Mock;
    markSeen: Mock;
    removeDocument: Mock;
    isDocumentReferenced: Mock;
  };
  let classAssignmentService: {
    findAssignmentsByClasses: Mock;
    isAssignmentInClass: Mock;
    addAssignmentToSection: Mock;
    removeAssignment: Mock;
    isAssignmentReferenced: Mock;
    findReferencedAssignmentIds: Mock;
    purgeDeletedAssignmentItems: Mock;
  };
  let classExamService: {
    findExamsByClasses: Mock;
    isExamInClass: Mock;
    removeExam: Mock;
    isExamReferenced: Mock;
  };

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
      addAssignmentToSection: vi.fn().mockResolvedValue(true),
      removeAssignment: vi.fn().mockResolvedValue(1),
      isAssignmentReferenced: vi.fn().mockResolvedValue(true),
      findReferencedAssignmentIds: vi.fn().mockResolvedValue(new Set(['a-1'])),
      purgeDeletedAssignmentItems: vi.fn().mockResolvedValue(['a-1', 'a-2']),
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

  describe('documents', () => {
    it('getDocumentIdsInClass delegates with and without scope', async () => {
      expect(await facade.getDocumentIdsInClass('c-1')).toEqual(['d-1']);
      expect(classDocumentService.getDocumentIds).toHaveBeenLastCalledWith('c-1', undefined);

      await facade.getDocumentIdsInClass('c-1', scope);
      expect(classDocumentService.getDocumentIds).toHaveBeenLastCalledWith('c-1', scope);
    });

    it('isDocumentInClass forwards the scope', async () => {
      expect(await facade.isDocumentInClass('c-1', 'd-1', scope)).toBe(true);
      expect(classDocumentService.isDocumentInClass).toHaveBeenCalledWith('c-1', 'd-1', scope);
    });

    it('getSeenDocumentIds returns the set from the service', async () => {
      expect(await facade.getSeenDocumentIds('c-1', 's-1')).toEqual(new Set(['d-1']));
      expect(classDocumentService.getSeenDocumentIds).toHaveBeenCalledWith('c-1', 's-1');
    });

    it('markDocumentSeen forwards every argument including the scope', async () => {
      await expect(facade.markDocumentSeen('c-1', 'd-1', 's-1', scope)).resolves.toBeUndefined();
      expect(classDocumentService.markSeen).toHaveBeenCalledWith('c-1', 'd-1', 's-1', scope);
    });

    it('removeDocumentFromClass passes deletedBy through', async () => {
      expect(await facade.removeDocumentFromClass('c-1', 'd-1', 'u-1')).toBe(1);
      expect(classDocumentService.removeDocument).toHaveBeenCalledWith('c-1', 'd-1', 'u-1');
    });

    it('removeDocumentFromClass falls back to null when deletedBy is omitted', async () => {
      await facade.removeDocumentFromClass('c-1', 'd-1');
      expect(classDocumentService.removeDocument).toHaveBeenCalledWith('c-1', 'd-1', null);
    });

    it('isDocumentReferenced delegates', async () => {
      expect(await facade.isDocumentReferenced('d-1')).toBe(false);
      expect(classDocumentService.isDocumentReferenced).toHaveBeenCalledWith('d-1');
    });
  });

  describe('assignments', () => {
    it('findAssignmentsByClasses forwards class ids and scope', async () => {
      expect(await facade.findAssignmentsByClasses(['c-1'], scope)).toEqual([
        { classId: 'c-1', assignmentId: 'a-1' },
      ]);
      expect(classAssignmentService.findAssignmentsByClasses).toHaveBeenCalledWith(
        ['c-1'],
        scope,
      );
    });

    it('isAssignmentInClass forwards the scope', async () => {
      expect(await facade.isAssignmentInClass('c-1', 'a-1', scope)).toBe(true);
      expect(classAssignmentService.isAssignmentInClass).toHaveBeenCalledWith(
        'c-1',
        'a-1',
        scope,
      );
    });

    it('addAssignmentToSection forwards every argument', async () => {
      expect(await facade.addAssignmentToSection('c-1', 'sec-1', 'a-1', 'Homework 1')).toBe(true);
      expect(classAssignmentService.addAssignmentToSection).toHaveBeenCalledWith(
        'c-1',
        'sec-1',
        'a-1',
        'Homework 1',
      );
    });

    it('addAssignmentToSection returns false when the section is not of the class', async () => {
      classAssignmentService.addAssignmentToSection.mockResolvedValue(false);

      expect(await facade.addAssignmentToSection('c-1', 'other', 'a-1', 'x')).toBe(false);
    });

    it('removeAssignmentFromClass passes deletedBy through', async () => {
      expect(await facade.removeAssignmentFromClass('c-1', 'a-1', 'u-1')).toBe(1);
      expect(classAssignmentService.removeAssignment).toHaveBeenCalledWith('c-1', 'a-1', 'u-1');
    });

    it('removeAssignmentFromClass falls back to null when deletedBy is omitted', async () => {
      await facade.removeAssignmentFromClass('c-1', 'a-1');
      expect(classAssignmentService.removeAssignment).toHaveBeenCalledWith('c-1', 'a-1', null);
    });

    it('isAssignmentReferenced delegates', async () => {
      expect(await facade.isAssignmentReferenced('a-1')).toBe(true);
      expect(classAssignmentService.isAssignmentReferenced).toHaveBeenCalledWith('a-1');
    });

    it('findReferencedAssignmentIds returns the set from the service', async () => {
      expect(await facade.findReferencedAssignmentIds(['a-1', 'a-2'])).toEqual(new Set(['a-1']));
      expect(classAssignmentService.findReferencedAssignmentIds).toHaveBeenCalledWith([
        'a-1',
        'a-2',
      ]);
    });

    it('purgeDeletedAssignmentItems forwards the cutoff and returns the purged ids', async () => {
      const cutoff = new Date('2026-01-01T00:00:00Z');

      expect(await facade.purgeDeletedAssignmentItems(cutoff)).toEqual(['a-1', 'a-2']);
      expect(classAssignmentService.purgeDeletedAssignmentItems).toHaveBeenCalledWith(cutoff);
    });
  });

  describe('exams', () => {
    it('findExamsByClasses forwards class ids and scope', async () => {
      expect(await facade.findExamsByClasses(['c-1'], scope)).toEqual([
        { classId: 'c-1', examId: 'e-1' },
      ]);
      expect(classExamService.findExamsByClasses).toHaveBeenCalledWith(['c-1'], scope);
    });

    it('isExamInClass forwards the scope', async () => {
      expect(await facade.isExamInClass('c-1', 'e-1', scope)).toBe(true);
      expect(classExamService.isExamInClass).toHaveBeenCalledWith('c-1', 'e-1', scope);
    });

    it('removeExamFromClass passes deletedBy through', async () => {
      expect(await facade.removeExamFromClass('c-1', 'e-1', 'u-1')).toBe(2);
      expect(classExamService.removeExam).toHaveBeenCalledWith('c-1', 'e-1', 'u-1');
    });

    it('removeExamFromClass falls back to null when deletedBy is omitted', async () => {
      await facade.removeExamFromClass('c-1', 'e-1');
      expect(classExamService.removeExam).toHaveBeenCalledWith('c-1', 'e-1', null);
    });

    it('isExamReferenced delegates', async () => {
      expect(await facade.isExamReferenced('e-1')).toBe(false);
      expect(classExamService.isExamReferenced).toHaveBeenCalledWith('e-1');
    });
  });

  describe('error propagation', () => {
    it('rethrows errors from the underlying services unchanged', async () => {
      const error = new Error('db down');
      classDocumentService.getDocumentIds.mockRejectedValue(error);
      classAssignmentService.isAssignmentInClass.mockRejectedValue(error);
      classExamService.isExamReferenced.mockRejectedValue(error);

      await expect(facade.getDocumentIdsInClass('c-1')).rejects.toBe(error);
      await expect(facade.isAssignmentInClass('c-1', 'a-1')).rejects.toBe(error);
      await expect(facade.isExamReferenced('e-1')).rejects.toBe(error);
    });
  });
});

