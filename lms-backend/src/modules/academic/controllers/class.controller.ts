import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClassService } from '../services/class.service.js';
import { CreateClassDto } from '../dto/create-class.dto.js';
import { UpdateClassDto } from '../dto/update-class.dto.js';
import { ClassView } from '../types/class-view.type.js';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';

@Controller('classes')
@Auth(Role.ADMIN)
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('test')
  test(): string {
    return 'Class module OK';
  }

  @Post()
  async create(@Body() dto: CreateClassDto): Promise<ClassView> {
    return this.classService.create(dto);
  }

  @Get()
  async getAll(
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('semesterId') semesterId?: string,
    @Query('search') search?: string,
  ): Promise<ClassView[]> {
    return this.classService.findAll({
      isActive,
      semesterId,
      search,
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ClassView> {
    const cls = await this.classService.findById(id);
    const count = await this.classService.countStudents(id);
    return ClassView.fromEntity(cls, count);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ): Promise<ClassView> {
    return this.classService.update(id, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<ClassView> {
    return this.classService.deactivate(id);
  }
}
