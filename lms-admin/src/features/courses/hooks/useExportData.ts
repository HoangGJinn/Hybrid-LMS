import { useMutation } from '@tanstack/react-query';
import { downloadBlob } from '@/shared/utils/download';
import { exportService } from '../api/export.service';
import type { RosterExportParams } from '../types/courses.types';

interface RosterExportVariables extends RosterExportParams {
  /** Semester code, only used in the file name. */
  semesterCode: string | null;
}

/** Downloads the classes and students of a semester (or of every semester) as one Excel file. */
export const useExportClassRosters = () =>
  useMutation({
    mutationFn: async ({ semesterCode, ...params }: RosterExportVariables) => {
      const blob = await exportService.exportClassRosters(params);
      const scope = semesterCode ?? 'all-semesters';
      downloadBlob(blob, `Class-rosters-${scope}-${params.status}.xlsx`);
    },
  });

/** Downloads the subject, semester and lecturer codes as one Excel file. */
export const useExportReferenceCodes = () =>
  useMutation({
    mutationFn: async () => {
      downloadBlob(await exportService.exportReferenceCodes(), 'Reference-codes.xlsx');
    },
  });
