import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, IsUUID } from 'class-validator';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { XesMappingService } from '../services/xes-mapping.service.js';

class SubjectDto {
  @IsUUID()
  subjectId: string;
}

class ConfirmDto {
  /** XES KC routes ("A----B----C") that match this KC. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  routes: string[];
}

@Controller('xes-mappings')
export class XesMappingController {
  constructor(private readonly service: XesMappingService) {}

  /** Computes the closest XES KCs for every KC of the subject (replaces earlier SUGGESTED rows). */
  @Post('suggest')
  @Auth(Role.LECTURER)
  suggest(@Body() dto: SubjectDto) {
    return this.service.suggestForSubject(dto.subjectId);
  }

  @Get()
  @Auth(Role.LECTURER)
  list(@Query('subjectId', ParseUUIDPipe) subjectId: string) {
    return this.service.listForSubject(subjectId);
  }

  /** Body: { routes: string[] }. After this, new questions of the KC map to those XES KCs. */
  @Patch('kcs/:kcId/confirm')
  @Auth(Role.LECTURER)
  async confirm(@Param('kcId', ParseUUIDPipe) kcId: string, @Body() dto: ConfirmDto) {
    await this.service.confirm(kcId, dto.routes);
    return { ok: true };
  }

  /** Maps the subject's existing questions that still have no xes_question_id. */
  @Post('backfill')
  @Auth(Role.LECTURER)
  backfill(@Body() dto: SubjectDto) {
    return this.service.backfill(dto.subjectId);
  }
}