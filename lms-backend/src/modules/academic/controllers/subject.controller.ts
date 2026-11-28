import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SubjectService } from '../services/subject.service.js';
import { SubjectImportService } from '../services/subject-import.service.js';
import { ImportSubjectsDto } from '../dto/import-subjects.dto.js';
import { CatalogImportResult } from '../types/catalog-import.type.js';
import { CreateSubjectDto } from '../dto/create-subject.dto.js';
import { UpdateSubjectDto } from '../dto/update-subject.dto.js';
import { SubjectView } from '../types/subject-view.type.js';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';

@Controller('subjects')
export class SubjectController {
  constructor(
    private readonly subjectService: SubjectService,
    private readonly importService: SubjectImportService,
  ) {}

  @Get()
  @Auth(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  async getAll(): Promise<SubjectView[]> {
    const subjects = await this.subjectService.findAll();
    return subjects.map((s) => SubjectView.fromEntity(s));
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  async getById(@Param('id') id: string): Promise<SubjectView> {
    const subject = await this.subjectService.findById(id);
    return SubjectView.fromEntity(subject);
  }

  /**
   * Bulk create from the rows of an Excel file. With `dryRun` it only reports, per row, whether the
   * subject would be created, skipped as a duplicate or rejected.
   */
  @Post('import')
  @Auth(Role.ADMIN)
  async importSubjects(
    @Body() dto: ImportSubjectsDto,
  ): Promise<CatalogImportResult> {
    return this.importService.importSubjects(dto);
  }

  @Post()
  @Auth(Role.ADMIN)
  async create(@Body() dto: CreateSubjectDto): Promise<SubjectView> {
    const subject = await this.subjectService.create(dto);
    return SubjectView.fromEntity(subject);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<SubjectView> {
    const subject = await this.subjectService.update(id, dto);
    return SubjectView.fromEntity(subject);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.subjectService.delete(id);
    return { message: 'Subject deleted successfully' };
  }
}