import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './controllers/file.controller.js';
import { FileAttachment } from './entities/file-attachment.entity.js';
import { FileFacade } from './facades/file.facade.js';
import { FileRepository } from './repositories/file.repository.js';
import { FileStorageService } from './services/file-storage.service.js';
import { FileService } from './services/file.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([FileAttachment])],
  controllers: [FileController],
  providers: [FileRepository, FileStorageService, FileService, FileFacade],
  exports: [FileFacade],
})
export class FileModule {}
