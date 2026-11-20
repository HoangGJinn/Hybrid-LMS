import { Injectable } from '@nestjs/common';
// Chỉnh đường dẫn import cho khớp repo thật
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  safeFileName,
  type ExportedFile,
} from '../../../shared/excel/workbook.util.js';
import { buildRows, buildSummary, matchesSearch } from '../utils/gradebook.calculator.js';
import { buildGradebookWorkbook } from '../utils/gradebook-export.builder.js';
import { GradebookRepository } from '../repositories/gradebook.repository.js';
import type { GradebookQueryDto } from '../dto/gradebook-query.dto.js';
import type {
  GradeColumnView,
  GradeRowView,
  GradebookSummaryView,
  GradebookView,
} from '../types/gradebook.types.js';

/** Every student and column of a class, before paging or searching. */
interface FullGradebook {
  classCode: string;
  columns: GradeColumnView[];
  rows: GradeRowView[];
  summary: GradebookSummaryView;
}

@Injectable()
export class GradebookService {
  constructor(
    private readonly academicFacade: AcademicFacade,
    private readonly repository: GradebookRepository,
  ) {}

  async getGradebook(
    classId: string,
    query: GradebookQueryDto,
    user: AuthenticatedUser,
  ): Promise<GradebookView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const { classCode, columns, rows: allRows, summary } = await this.loadFullGradebook(classId);

    const filtered = query.search
      ? allRows.filter((r) => matchesSearch(r, query.search ?? ''))
      : allRows;
    const start = (query.page - 1) * query.limit;

    return {
      classId,
      classCode,
      columns,
      summary,
      rows: filtered.slice(start, start + query.limit),
      page: query.page,
      limit: query.limit,
      total: filtered.length,
    };
  }

  /** The whole gradebook of the class (all students, no paging) as an Excel file for the lecturer. */
  async exportGradebook(classId: string, user: AuthenticatedUser): Promise<ExportedFile> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const { classCode, columns, rows, summary } = await this.loadFullGradebook(classId);
    const buffer = await buildGradebookWorkbook({
      classCode,
      exportedAt: new Date(),
      columns,
      rows,
      summary,
    });
    return { fileName: `${safeFileName(`Bang-diem-${classCode}`)}.xlsx`, buffer };
  }

  private async loadFullGradebook(classId: string): Promise<FullGradebook> {
    const [classCode, columnDefs, students, scores] = await Promise.all([
      this.repository.getClassCode(classId),
      this.repository.listColumns(classId),
      this.repository.listStudents(classId),
      this.repository.listScores(classId),
    ]);

    const columns = [...columnDefs]
      .sort((a, b) => a.order - b.order)
      .map(({ order: _order, ...column }) => column);

    const sorted = [...students].sort((a, b) =>
      a.studentCode.localeCompare(b.studentCode),
    );
    const rows = buildRows(sorted, columns, scores);
    return { classCode, columns, rows, summary: buildSummary(rows) };
  }
}