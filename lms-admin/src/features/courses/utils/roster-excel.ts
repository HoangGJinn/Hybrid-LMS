import type { Worksheet } from "exceljs";
import type {
  ClassFilePayload,
  EnrollmentRowPayload,
} from "../types/courses.types";
import {
  CLASS_IMPORT_HEADERS,
  CLASS_IMPORT_SAMPLE_ROW,
  parseClassRecords,
  sheetToRecords,
} from "./class-excel";

/** Most files in one import; the backend enforces the same limits. */
export const MAX_ROSTER_FILES = 20;
export const MAX_STUDENT_ROWS = 10000;

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CLASSES_SHEET = "Classes";
const STUDENTS_SHEET = "Students";
const GUIDE_SHEET = "Guide";

/** Column titles of the "Students" sheet in the template. */
export const STUDENT_HEADERS = ["Class Code", "Student Code", "Email"] as const;

type StudentField = Exclude<keyof EnrollmentRowPayload, "line">;

/** Accepted header spellings per field, compared after removing case, spaces and punctuation. */
const STUDENT_ALIASES: Record<StudentField, readonly string[]> = {
  classCode: ["classcode", "class"],
  studentCode: ["studentcode", "student", "studentid", "mssv", "code"],
  email: ["email", "studentemail"],
};

export interface ParsedRosterFile extends ClassFilePayload {
  /** Why the file cannot be imported; null when it is usable. */
  error: string | null;
}

const normalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, "");

const failed = (name: string, error: string): ParsedRosterFile => ({
  name,
  classes: [],
  students: [],
  error,
});

interface ParsedStudents {
  students: EnrollmentRowPayload[];
  error: string | null;
}

/**
 * Turns the rows of a "Students" sheet into import rows. `records[0]` is the header, and
 * `records[n]` is row n + 1 of the sheet, so `line` matches the row numbers Excel shows.
 */
export const parseStudentRecords = (records: string[][]): ParsedStudents => {
  const header = (records[0] ?? []).map(normalizeHeader);
  const columnOf = (field: StudentField): number =>
    header.findIndex((name) => STUDENT_ALIASES[field].includes(name));
  const columns = (["classCode", "studentCode", "email"] as const).map(
    (field) => ({ field, index: columnOf(field) }),
  );

  const hasIdentity = columns.some(
    ({ field, index }) => field !== "classCode" && index !== -1,
  );
  if (!hasIdentity) {
    return {
      students: [],
      error: `The "${STUDENTS_SHEET}" sheet needs a "Student Code" or an "Email" column in its first row.`,
    };
  }

  const students: EnrollmentRowPayload[] = [];
  records.slice(1).forEach((record, offset) => {
    if (record.every((cell) => cell.trim() === "")) return;
    const row: EnrollmentRowPayload = { line: offset + 2 };
    for (const { field, index } of columns) {
      const value = index === -1 ? "" : (record[index] ?? "").trim();
      if (value) row[field] = value;
    }
    students.push(row);
  });

  if (students.length > MAX_STUDENT_ROWS) {
    return {
      students: [],
      error: `A file can list at most ${MAX_STUDENT_ROWS} students; this one has ${students.length}.`,
    };
  }
  return { students, error: null };
};

const findSheet = (
  sheets: readonly Worksheet[],
  name: string,
): Worksheet | undefined =>
  sheets.find(
    (sheet) => sheet.name.trim().toLowerCase() === name.toLowerCase(),
  );

/**
 * Reads one roster file. The classes come from the "Classes" sheet (or the first sheet that is not
 * "Students" / "Guide") and the students from the "Students" sheet, which may be absent.
 */
export const parseRosterWorkbook = async (
  name: string,
  content: ArrayBuffer,
): Promise<ParsedRosterFile> => {
  // Loaded on demand: the library is large and only the import pages need it.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(content);
  } catch {
    return failed(name, "This is not a valid Excel (.xlsx) file.");
  }

  const sheets = workbook.worksheets;
  const studentsSheet = findSheet(sheets, STUDENTS_SHEET);
  const classesSheet =
    findSheet(sheets, CLASSES_SHEET) ??
    sheets.find(
      (sheet) =>
        sheet !== studentsSheet &&
        sheet.name.trim().toLowerCase() !== GUIDE_SHEET.toLowerCase(),
    );
  if (!classesSheet) return failed(name, 'The file has no "Classes" sheet.');

  const classes = parseClassRecords(sheetToRecords(classesSheet));
  if (classes.error)
    return failed(name, `Sheet "${classesSheet.name}": ${classes.error}`);

  if (!studentsSheet) {
    return { name, classes: classes.rows, students: [], error: null };
  }
  const students = parseStudentRecords(sheetToRecords(studentsSheet));
  if (students.error) return failed(name, students.error);
  return {
    name,
    classes: classes.rows,
    students: students.students,
    error: null,
  };
};

const GUIDE_ROWS: readonly (readonly string[])[] = [
  ["Sheet", "Column", "Meaning", "Example"],
  [
    "Classes",
    "Class Code",
    "Unique code. A code that already exists, or repeats in another file, is skipped.",
    "WEB26.01",
  ],
  [
    "Classes",
    "Class Name",
    "Display name of the class.",
    "Web development - Group 1",
  ],
  ["Classes", "Subject Code", "Code of an existing subject.", "IT001"],
  ["Classes", "Semester Code", "Code of an existing semester.", "2026-1"],
  [
    "Classes",
    "Lecturer Code/Email",
    "Code or email of a lecturer who is currently working.",
    "GV26000001",
  ],
  [
    "Students",
    "Class Code",
    "Class the student joins. Leave it empty when the file has only one class.",
    "WEB26.01",
  ],
  [
    "Students",
    "Student Code",
    "Code of an existing student (use this or Email).",
    "SV26000001",
  ],
  [
    "Students",
    "Email",
    "Email of an existing student (use this or Student Code).",
    "sv1@school.edu.vn",
  ],
];

/** The downloadable template: "Classes" and "Students" sheets to fill in, plus a "Guide" sheet. */
export const buildRosterTemplate = async (): Promise<Blob> => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  const addTableSheet = (name: string, headers: readonly string[]): void => {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow([...headers]);
    sheet.getRow(1).font = { bold: true };
    headers.forEach((_header, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = 26;
      // Text format: Excel would otherwise turn a code such as 2026-1 into a date.
      column.numFmt = "@";
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  };
  addTableSheet(CLASSES_SHEET, CLASS_IMPORT_HEADERS);
  addTableSheet(STUDENTS_SHEET, STUDENT_HEADERS);

  const guide = workbook.addWorksheet(GUIDE_SHEET);
  GUIDE_ROWS.forEach((row) => guide.addRow([...row]));
  guide.getRow(1).font = { bold: true };
  [12, 22, 70, 28].forEach((width, index) => {
    guide.getColumn(index + 1).width = width;
  });

  return new Blob([await workbook.xlsx.writeBuffer()], { type: XLSX_MIME });
};

/** An example "Students" row, shown on screen next to the template. */
export const STUDENT_SAMPLE_ROW: readonly string[] = [
  CLASS_IMPORT_SAMPLE_ROW[0],
  "SV26000001",
  "sv1@school.edu.vn",
];