import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { CLASS_IMPORT_HEADERS } from "./class-excel";
import {
  MAX_STUDENT_ROWS,
  STUDENT_HEADERS,
  buildRosterTemplate,
  parseRosterWorkbook,
  parseStudentRecords,
} from "./roster-excel";

const toArrayBuffer = async (
  workbook: ExcelJS.Workbook,
): Promise<ArrayBuffer> =>
  new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;

const classRow = ["WEB26.01", "Web 1", "IT001", "2026-1", "GV26000001"];

describe("parseStudentRecords", () => {
  it("maps the columns and keeps the row numbers of the sheet", () => {
    const parsed = parseStudentRecords([
      [...STUDENT_HEADERS],
      ["WEB26.01", "SV26000001", ""],
      ["", "", ""],
      ["", "", "sv2@school.edu.vn"],
    ]);

    expect(parsed.error).toBeNull();
    expect(parsed.students).toEqual([
      { line: 2, classCode: "WEB26.01", studentCode: "SV26000001" },
      { line: 4, email: "sv2@school.edu.vn" },
    ]);
  });

  it("accepts a sheet with only a student code column, in any spelling", () => {
    const parsed = parseStudentRecords([[" MSSV "], ["SV1"], ["SV2"]]);

    expect(parsed.students).toEqual([
      { line: 2, studentCode: "SV1" },
      { line: 3, studentCode: "SV2" },
    ]);
  });

  it("needs a student code or an email column", () => {
    const parsed = parseStudentRecords([["Class Code"], ["WEB26.01"]]);

    expect(parsed.students).toEqual([]);
    expect(parsed.error).toContain('"Student Code" or an "Email" column');
  });

  it("rejects more students than the backend accepts", () => {
    const records = [
      ["Student Code"],
      ...Array.from({ length: MAX_STUDENT_ROWS + 1 }, (_, i) => [`SV${i}`]),
    ];

    expect(parseStudentRecords(records).error).toContain(
      `at most ${MAX_STUDENT_ROWS}`,
    );
  });
});

describe("parseRosterWorkbook", () => {
  it("reads the classes and the students of a real .xlsx file", async () => {
    const workbook = new ExcelJS.Workbook();
    const classes = workbook.addWorksheet("Classes");
    classes.addRow([...CLASS_IMPORT_HEADERS]);
    classes.addRow(classRow);
    const students = workbook.addWorksheet("Students");
    students.addRow(["Student Code", "Full Name"]);
    students.addRow(["SV26000001", "Student 1"]);
    students.addRow(["SV26000002", "Student 2"]);

    const parsed = await parseRosterWorkbook(
      "a.xlsx",
      await toArrayBuffer(workbook),
    );

    expect(parsed.error).toBeNull();
    expect(parsed.name).toBe("a.xlsx");
    expect(parsed.classes).toHaveLength(1);
    expect(parsed.classes[0]).toMatchObject({ line: 2, classCode: "WEB26.01" });
    expect(parsed.students).toEqual([
      { line: 2, studentCode: "SV26000001" },
      { line: 3, studentCode: "SV26000002" },
    ]);
  });

  it("finds the sheets by name in any order and case, and skips the Guide sheet", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Guide").addRow(["ignored"]);
    const students = workbook.addWorksheet("students");
    students.addRow(["Student Code"]);
    students.addRow(["SV1"]);
    const classes = workbook.addWorksheet("CLASSES");
    classes.addRow([...CLASS_IMPORT_HEADERS]);
    classes.addRow(classRow);

    const parsed = await parseRosterWorkbook(
      "a.xlsx",
      await toArrayBuffer(workbook),
    );

    expect(parsed.error).toBeNull();
    expect(parsed.classes).toHaveLength(1);
    expect(parsed.students).toHaveLength(1);
  });

  it('treats the first sheet as the classes when there is no "Classes" sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow([...CLASS_IMPORT_HEADERS]);
    sheet.addRow(classRow);

    const parsed = await parseRosterWorkbook(
      "a.xlsx",
      await toArrayBuffer(workbook),
    );

    expect(parsed.error).toBeNull();
    expect(parsed.classes).toHaveLength(1);
    expect(parsed.students).toEqual([]);
  });

  it("explains why a file cannot be used", async () => {
    const noClasses = new ExcelJS.Workbook();
    const sheet = noClasses.addWorksheet("Classes");
    sheet.addRow([...CLASS_IMPORT_HEADERS]);

    const badStudents = new ExcelJS.Workbook();
    const classes = badStudents.addWorksheet("Classes");
    classes.addRow([...CLASS_IMPORT_HEADERS]);
    classes.addRow(classRow);
    badStudents.addWorksheet("Students").addRow(["Full Name"]);

    expect(
      (await parseRosterWorkbook("a.xlsx", await toArrayBuffer(noClasses)))
        .error,
    ).toBe('Sheet "Classes": The file has no class rows.');
    expect(
      (await parseRosterWorkbook("b.xlsx", await toArrayBuffer(badStudents)))
        .error,
    ).toContain('"Student Code" or an "Email" column');
    expect(
      (
        await parseRosterWorkbook(
          "c.xlsx",
          new TextEncoder().encode("a,b").buffer,
        )
      ).error,
    ).toBe("This is not a valid Excel (.xlsx) file.");
  });
});

describe("buildRosterTemplate", () => {
  it("has the Classes, Students and Guide sheets, and parses as having no class rows", async () => {
    const content = await (await buildRosterTemplate()).arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(content);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Classes",
      "Students",
      "Guide",
    ]);
    expect(workbook.getWorksheet("Students")?.getRow(1).values).toEqual([
      undefined,
      ...STUDENT_HEADERS,
    ]);

    expect((await parseRosterWorkbook("t.xlsx", content)).error).toBe(
      'Sheet "Classes": The file has no class rows.',
    );
  });
});