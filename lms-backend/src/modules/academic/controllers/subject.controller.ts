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
import { CreateSubjectDto } from '../dto/create-subject.dto.js';
import { UpdateSubjectDto } from '../dto/update-subject.dto.js';
import { SubjectView } from '../types/subject-view.type.js';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';

@Controller('subjects')
@Auth(Role.ADMIN)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get('test')
  test(): string {
    return 'Subject module OK';
  }

  @Get()
  async getAll(): Promise<SubjectView[]> {
    const subjects = await this.subjectService.findAll();
    return subjects.map((s) => SubjectView.fromEntity(s));
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<SubjectView> {
    const subject = await this.subjectService.findById(id);
    return SubjectView.fromEntity(subject);
  }

  @Post()
  async create(@Body() dto: CreateSubjectDto): Promise<SubjectView> {
    const subject = await this.subjectService.create(dto);
    return SubjectView.fromEntity(subject);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<SubjectView> {
    const subject = await this.subjectService.update(id, dto);
    return SubjectView.fromEntity(subject);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.subjectService.delete(id);
    return { message: 'Subject deleted successfully' };
  }
}
