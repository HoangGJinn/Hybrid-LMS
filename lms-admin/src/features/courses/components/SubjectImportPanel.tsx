import { subjectService } from "../api/subject.service";
import { courseKeys } from "../api/queryKeys";
import type { SubjectImportRowPayload } from "../types/courses.types";
import {
  SUBJECT_IMPORT_HEADERS,
  SUBJECT_IMPORT_SAMPLE_ROW,
  buildSubjectTemplate,
  parseSubjectWorkbook,
} from "../utils/catalog-excel";
import { MAX_IMPORT_ROWS } from "../utils/class-excel";
import {
  CatalogImportPanel,
  type CatalogImportConfig,
} from "./CatalogImportPanel";

const CONFIG: CatalogImportConfig<SubjectImportRowPayload> = {
  id: "subjects",
  noun: "subject",
  description: (
    <>
      One subject per row, up to {MAX_IMPORT_ROWS} rows. Each row needs a subject
      code and a subject name; the description is optional. A subject whose code
      already exists, or that appears twice in the file, is skipped. The
      template also has a "Guide" sheet.
    </>
  ),
  headers: SUBJECT_IMPORT_HEADERS,
  sampleRow: SUBJECT_IMPORT_SAMPLE_ROW,
  templateFileName: "subjects-template.xlsx",
  buildTemplate: buildSubjectTemplate,
  parseWorkbook: parseSubjectWorkbook,
  importRows: subjectService.importSubjects,
  invalidateKey: courseKeys.subjects(),
};

/** Bulk "Create subject" from an Excel file. */
export const SubjectImportPanel = () => <CatalogImportPanel config={CONFIG} />;
