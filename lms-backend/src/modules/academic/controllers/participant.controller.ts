import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ParticipantService } from '../services/participant.service.js';
import { AddParticipantDto } from '../dto/add-participant.dto.js';
import { ImportParticipantsDto } from '../dto/import-participants.dto.js';
import {
  ParticipantCandidateView,
  ParticipantImportResult,
  ParticipantView,
} from '../types/participant-view.type.js';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AddParticipantsDto } from '../dto/add-participants.dto.js';
import { AddStudentsResult } from '../types/add-students-result.type.js';

/**
 * Participants (enrolled students) of a class. Admins manage every class,
 * a lecturer only the classes they teach (checked in `ParticipantService`).
 */
@Controller('classes/:classId/participants')
@Auth(Role.ADMIN, Role.LECTURER)
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  /** Manage Participants: the student list of the class. `?search=` matches name, email or student code. */
  @Get()
  async list(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
  ): Promise<ParticipantView[]> {
    return this.participantService.list(classId, user, search);
  }

  /** Students that can be added to the class (`alreadyInClass` marks those who are in it). */
  @Get('candidates')
  async candidates(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<ParticipantCandidateView[]> {
    return this.participantService.searchCandidates(
      classId,
      user,
      search,
      limit,
    );
  }

  /** Add Participant. 409 when the student is already in the class. */
  @Post()
  async add(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddParticipantDto,
  ): Promise<ParticipantView> {
    return this.participantService.add(classId, user, dto);
  }

  /** Add several students at once. Students already in the class are skipped. */
  @Post('bulk')
  async addMany(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddParticipantsDto,
  ): Promise<AddStudentsResult> {
    return this.participantService.addMany(classId, user, dto);
  }

  /** Bulk add from an import file. `dryRun: true` only previews the outcome. */
  @Post('import')
  async importParticipants(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportParticipantsDto,
  ): Promise<ParticipantImportResult> {
    return this.participantService.importParticipants(classId, user, dto);
  }

  /** Remove Participant: ends the enrolment, the student account is untouched. */
  @Delete(':studentId')
  async remove(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.participantService.remove(classId, user, studentId);
  }
}
