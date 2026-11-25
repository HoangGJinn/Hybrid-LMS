import { get, post } from '@/core/api/http';
import type {
  CatalogImportResult,
  SemesterImportRowPayload,
  SemesterView,
} from '../types/courses.types';

export const semesterService = {
  getSemesters: (): Promise<SemesterView[]> =>
    get<SemesterView[]>('/api/semesters'),

  /** `dryRun: true` only reports what the import would do. */
  importSemesters: (
    rows: SemesterImportRowPayload[],
    dryRun: boolean,
  ): Promise<CatalogImportResult> =>
    post<CatalogImportResult>('/api/semesters/import', { rows, dryRun }),
};
