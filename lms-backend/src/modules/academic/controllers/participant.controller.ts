import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { Auth } from '../../../common/decorators/auth.decorator.js'
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { Role } from '../../../common/enums/role.enum.js'
import { ParticipantService } from '../services/participant.service.js'
import { AddParticipantsDto } from '../dto/add-participants.dto.js'
import { ParticipantView } from '../types/participant-view.type.js'
import { StudentCandidateView } from '../types/student-candidate-view.type.js'
import { AddStudentsResult } from '../types/add-students-result.type.js'

@Controller('classes/:classId/participants')
@Auth(Role.LECTURER, Role.ADMIN)
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Get()
  async getAll(
    @Param('classId') classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ParticipantView[]> {
    return this.participantService.findAll(classId, user)
  }

  @Get('candidates')
  async searchCandidates(
    @Param('classId') classId: string,
    @Query('search') search: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentCandidateView[]> {
    return this.participantService.searchCandidates(classId, search ?? '', user)
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async add(
    @Param('classId') classId: string,
    @Body() dto: AddParticipantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddStudentsResult> {
    return this.participantService.add(classId, dto, user)
  }

  @Delete(':studentId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.participantService.remove(classId, studentId, user)
  }
}