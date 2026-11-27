import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsString, IsUUID } from 'class-validator';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { XesMappingService } from '../services/xes-mapping.service.js';

class SubjectDto {
  @IsUUID()
  subjectId: string;
}

class SetRoutesDto {
  /** XES KC routes ("A----B----C") matching this KC. An empty array clears the mapping. */
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  routes: string[];
}

@Controller('xes-mappings')
export class XesMappingController {
  constructor(private readonly service: XesMappingService) {}

  /** Searches the XES3G5M KC list by words (empty query = the largest KCs). */
  @Get('routes')
  @Auth(Role.LECTURER)
  searchRoutes(@Query('q') q = '') {
    return this.service.searchRoutes(q);
  }

  /** Every KC of the subject with its chosen XES routes. */
  @Get()
  @Auth(Role.LECTURER)
  list(@Query('subjectId', ParseUUIDPipe) subjectId: string) {
    return this.service.listForSubject(subjectId);
  }

  /** Body: { routes: string[] }. Saves the mapping, then maps the subject's existing questions of the KC. */
  @Patch('kcs/:kcId/confirm')
  @Auth(Role.LECTURER)
  async setRoutes(@Param('kcId', ParseUUIDPipe) kcId: string, @Body() dto: SetRoutesDto) {
    return { ok: true, backfill: await this.service.setRoutes(kcId, dto.routes) };
  }

  /** Maps the subject's existing questions that still have no xes_question_id. */
  @Post('backfill')
  @Auth(Role.LECTURER)
  backfill(@Body() dto: SubjectDto) {
    return this.service.backfill(dto.subjectId);
  }
}