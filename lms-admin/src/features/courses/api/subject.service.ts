import { get, post } from '@/core/api/http';
import type {
  CatalogImportResult,
  SubjectImportRowPayload,
  SubjectView,
} from '../types/courses.types';

export const subjectService = {
  getSubjects: (): Promise<SubjectView[]> => get<SubjectView[]>('/api/subjects'),

  /** `dryRun: true` only reports what the import would do. */
  importSubjects: (
    rows: SubjectImportRowPayload[],
    dryRun: boolean,
  ): Promise<CatalogImportResult> =>
    post<CatalogImportResult>('/api/subjects/import', { rows, dryRun }),
};
