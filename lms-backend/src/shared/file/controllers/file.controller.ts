import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { RequestUploadDto } from '../dto/request-upload.dto.js';
import { FileService } from '../services/file.service.js';
import { FileConfirmView } from '../types/file-confirm-view.type.js';
import { UploadRequestView } from '../types/upload-request-view.type.js';

/** Direct-to-S3 upload flow: the backend only authorises and verifies, the bytes never pass through it. */
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /** Smoke test: confirms the file module is wired up. */
  @Get('test')
  getTest(): string {
    return 'File module is working';
  }

  @Post('upload-requests')
  @Auth(Role.LECTURER)
  async requestUpload(
    @Body() dto: RequestUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadRequestView> {
    return this.fileService.requestUpload(dto, user);
  }

  @Post(':fileId/confirm')
  @Auth(Role.LECTURER)
  @HttpCode(HttpStatus.OK)
  async confirmUpload(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FileConfirmView> {
    return this.fileService.confirmUpload(fileId, user);
  }
}
