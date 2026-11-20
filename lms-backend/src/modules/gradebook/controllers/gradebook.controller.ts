import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
// Chỉnh đường dẫn import cho khớp repo thật
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { GradebookQueryDto } from '../dto/gradebook-query.dto.js';
import { GradebookService } from '../services/gradebook.service.js';
import type { GradebookView } from '../types/gradebook.types.js';

@Controller('classes/:classId/gradebook')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Get()
  @Auth(Role.LECTURER, Role.ADMIN)
  async getGradebook(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: GradebookQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GradebookView> {
    return this.gradebookService.getGradebook(classId, query, user);
  }
}