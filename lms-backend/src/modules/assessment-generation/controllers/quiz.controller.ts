import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { CreateQuizDto, SubmitAnswerDto } from '../dto/quiz.dto.js';
import { QuizService } from '../services/quiz.service.js';

/** Student practice quizzes built from the question bank. */
@Controller('quizzes')
export class QuizController {
  constructor(private readonly service: QuizService) {}

  /** Body: { subjectId, numQuestions: 5|10|15, kcIds?: uuid[], focus?: "WEAK"|"EVEN", title? } */
  @Post()
  @Auth(Role.STUDENT)
  create(@Body() dto: CreateQuizDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(user.id, dto);
  }

  /** The student's recent quizzes, newest first. */
  @Get('me')
  @Auth(Role.STUDENT)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMine(user.id);
  }

  /** GET /quizzes/mastery?subjectId=...&kcIds=a,b: progress per topic. */
  @Get('mastery')
  @Auth(Role.STUDENT)
  mastery(
    @Query('subjectId', ParseUUIDPipe) subjectId: string,
    @Query(
      'kcIds',
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    kcIds: string[] | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.mastery(user.id, subjectId, kcIds);
  }

  /** GET /quizzes/practice-info?classId=...&documentId=...: topics of a document with the student's progress. */
  @Get('practice-info')
  @Auth(Role.STUDENT)
  practiceInfo(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Query('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.practiceInfo(user.id, classId, documentId);
  }

  @Get(':id')
  @Auth(Role.STUDENT)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.get(id, user.id);
  }

  /** Body: { quizInstanceQuestionId, selectedOptionId, timeSpentSeconds? }. Returns the feedback for that question. */
  @Post(':id/answers')
  @Auth(Role.STUDENT)
  @HttpCode(HttpStatus.OK)
  answer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.answer(id, user.id, dto);
  }

  @Post(':id/submit')
  @Auth(Role.STUDENT)
  @HttpCode(HttpStatus.OK)
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submit(id, user.id);
  }

  @Get(':id/result')
  @Auth(Role.STUDENT)
  result(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getResult(id, user.id);
  }
}