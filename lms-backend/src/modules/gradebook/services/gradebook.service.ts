import { Injectable } from '@nestjs/common';
// Chỉnh đường dẫn import cho khớp repo thật
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { buildRows, buildSummary, matchesSearch } from '../utils/gradebook.calculator.js';
import { GradebookRepository } from '../repositories/gradebook.repository.js';
import type { GradebookQueryDto } from '../dto/gradebook-query.dto.js';
import type { GradebookView } from '../types/gradebook.types.js';

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
    const allRows = buildRows(sorted, columns, scores);

    const summary = buildSummary(allRows);

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
}