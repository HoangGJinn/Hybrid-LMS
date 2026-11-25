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
import { SemesterService } from '../services/semester.service.js';
import { SemesterImportService } from '../services/semester-import.service.js';
import { ImportSemestersDto } from '../dto/import-semesters.dto.js';
import { CatalogImportResult } from '../types/catalog-import.type.js';
import { CreateSemesterDto } from '../dto/create-semester.dto.js';
import { UpdateSemesterDto } from '../dto/update-semester.dto.js';
import { SemesterView } from '../types/semester-view.type.js';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';

@Controller('semesters')
@Auth(Role.ADMIN)
export class SemesterController {
  constructor(
    private readonly semesterService: SemesterService,
    private readonly importService: SemesterImportService,
  ) {}

  @Get()
  async getAll(): Promise<SemesterView[]> {
    const semesters = await this.semesterService.findAll();
    return semesters.map((s) => SemesterView.fromEntity(s));
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<SemesterView> {
    const semester = await this.semesterService.findById(id);
    return SemesterView.fromEntity(semester);
  }

  /**
   * Bulk create from the rows of an Excel file. Dates are days in Vietnam time. With `dryRun` it only
   * reports, per row, whether the semester would be created, skipped as a duplicate or rejected.
   */
  @Post('import')
  async importSemesters(
    @Body() dto: ImportSemestersDto,
  ): Promise<CatalogImportResult> {
    return this.importService.importSemesters(dto);
  }

  @Post()
  async create(@Body() dto: CreateSemesterDto): Promise<SemesterView> {
    const semester = await this.semesterService.create(dto);
    return SemesterView.fromEntity(semester);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSemesterDto,
  ): Promise<SemesterView> {
    const semester = await this.semesterService.update(id, dto);
    return SemesterView.fromEntity(semester);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.semesterService.delete(id);
    return { message: 'Semester deleted successfully' };
  }
}
