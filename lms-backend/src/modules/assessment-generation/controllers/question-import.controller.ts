import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { ImportQuestionsDto } from '../dto/import-questions.dto.js';
import { QuestionImportService } from '../services/question-import.service.js';

@Controller('question-import-batches')
export class QuestionImportController {
  constructor(private readonly service: QuestionImportService) {}

  /** Body: { subjectId, fileId }. The Excel file is uploaded first through the existing file flow. */
  @Post()
  @Auth(Role.LECTURER)
  import(@Body() dto: ImportQuestionsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.importFromFile(dto.subjectId, dto.fileId, user.id);
  }

  /** GET /question-import-batches?subjectId=...: the lecturer's own imports, newest first. */
  @Get()
  @Auth(Role.LECTURER)
  list(
    @Query('subjectId', new ParseUUIDPipe({ optional: true }))
    subjectId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listBatches(user.id, subjectId);
  }

  @Get(':id')
  @Auth(Role.LECTURER)
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getBatch(id, user.id);
  }
}