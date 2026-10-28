import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common'
import { Auth } from '../../../common/decorators/auth.decorator.js'
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js'
import { Role } from '../../../common/enums/role.enum.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { CreateSectionDto } from '../dto/create-section.dto.js'
import { SaveSectionsDto } from '../dto/save-sections.dto.js'
import { SectionService } from '../services/section.service.js'
import { SectionView } from '../types/section-view.type.js'

/** Sections of one class: readable by its members, editable by its lecturer. */
@Controller('classes/:classId/sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Get()
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  async findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.findByClass(classId, user)
  }

  @Post()
  @Auth(Role.LECTURER)
  async create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView> {
    return this.sectionService.create(classId, dto, user)
  }

  @Post('bulk')
  @Auth(Role.LECTURER)
  @HttpCode(HttpStatus.OK)
  async saveAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: SaveSectionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.saveAll(classId, dto, user)
  }
}