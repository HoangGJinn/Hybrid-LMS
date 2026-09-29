import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FileAttachment } from './entities/file-attachment.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([FileAttachment])],
  providers: [],
  exports: [],
})
export class FileModule {}
