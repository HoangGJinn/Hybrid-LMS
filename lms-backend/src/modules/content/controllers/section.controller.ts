import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common'
import { Auth } from '../../../common/decorators/auth.decorator.js'
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js'
import { Role } from '../../../common/enums/role.enum.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { CreateSectionDto } from '../dto/create-section.dto.js'
import { CreateSectionItemDto } from '../dto/create-section-item.dto.js'
import { ReorderDto } from '../dto/reorder.dto.js'
import { SaveSectionsDto } from '../dto/save-sections.dto.js'
import { SetCompletionDto } from '../dto/set-completion.dto.js'
import { UpdateSectionItemDto } from '../dto/update-section-item.dto.js'
import { UpdateSectionDto } from '../dto/update-section.dto.js'
import { SectionService } from '../services/section.service.js'
import { SectionView } from '../types/section-view.type.js'

/**
 * Sections of one class: readable by its members, editable by its lecturer.
 * Every write below is saved immediately (Moodle-style) and answers with the class's full, fresh section list.
 */
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

  /** @deprecated The editor now saves each change on its own; kept so older clients keep working. */
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

  /** A student marks an item as done / not done. Opening a document or video does this automatically. */
  @Put('items/:itemId/completion')
  @Auth(Role.STUDENT)
  async setCompletion(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SetCompletionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ itemId: string; isCompleted: boolean }> {
    return this.sectionService.setItemCompleted(classId, itemId, dto, user)
  }

  @Put('order')
  @Auth(Role.LECTURER)
  async reorder(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: ReorderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.reorderSections(classId, dto, user)
  }

  @Patch(':sectionId')
  @Auth(Role.LECTURER)
  async update(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.updateSection(classId, sectionId, dto, user)
  }

  @Delete(':sectionId')
  @Auth(Role.LECTURER)
  async remove(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.removeSection(classId, sectionId, user)
  }

  @Post(':sectionId/items')
  @Auth(Role.LECTURER)
  async createItem(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateSectionItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.createItem(classId, sectionId, dto, user)
  }

  @Put(':sectionId/items/order')
  @Auth(Role.LECTURER)
  async reorderItems(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: ReorderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.reorderItems(classId, sectionId, dto, user)
  }

  @Patch(':sectionId/items/:itemId')
  @Auth(Role.LECTURER)
  async updateItem(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateSectionItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.updateItem(classId, sectionId, itemId, dto, user)
  }

  @Delete(':sectionId/items/:itemId')
  @Auth(Role.LECTURER)
  async removeItem(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    return this.sectionService.removeItem(classId, sectionId, itemId, user)
  }
}