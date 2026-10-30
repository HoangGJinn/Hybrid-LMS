import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../../shared/file/file.module.js';
import { AcademicModule } from '../academic/academic.module.js';
import { ContentModule } from '../content/content.module.js';
import { DocumentController } from './controllers/document.controller.js';
import { DocumentTextSegment } from './entities/document-text-segment.entity.js';
import { Document } from './entities/document.entity.js';
import { KnowledgeComponent } from './entities/knowledge-component.entity.js';
import { SegmentKeyphrase } from './entities/segment-keyphrase.entity.js';
import { SegmentKnowledgeComponent } from './entities/segment-knowledge-component.entity.js';
import { DocumentRepository } from './repositories/document.repository.js';
import { DocumentService } from './services/document.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentTextSegment,
      Document,
      KnowledgeComponent,
      SegmentKeyphrase,
      SegmentKnowledgeComponent,
    ]),
    AcademicModule,
    ContentModule,
    FileModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentRepository, DocumentService],
  exports: [],
})
export class DocumentModule {}
