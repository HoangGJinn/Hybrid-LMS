import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { CreateDocumentDto } from '../dto/create-document.dto.js';
import { DocumentService } from '../services/document.service.js';
import { DocumentSummaryView } from '../types/document-summary-view.type.js';
import { DocumentView } from '../types/document-view.type.js';

/** Documents of one class: viewable by its members. */
@Controller('classes/:classId/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /** Smoke test: confirms the document module is wired up. */
  @Get('test')
  getTest(): string {
    return 'Document module is working';
  }

  @Get()
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  async findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentSummaryView[]> {
    return this.documentService.findByClass(classId, user);
  }

  @Post()
  @Auth(Role.LECTURER)
  async create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentSummaryView> {
    return this.documentService.create(classId, dto, user);
  }

  @Get(':documentId')
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  async findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentView> {
    return this.documentService.findOne(classId, documentId, user);
  }

  @Patch(':documentId/seen')
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async markSeen(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.documentService.markSeen(classId, documentId, user);
  }
}
