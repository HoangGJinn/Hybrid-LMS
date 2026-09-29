import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DocumentTextSegment } from './entities/document-text-segment.entity.js'
import { Document } from './entities/document.entity.js'
import { KnowledgeComponent } from './entities/knowledge-component.entity.js'
import { SegmentKeyphrase } from './entities/segment-keyphrase.entity.js'
import { SegmentKnowledgeComponent } from './entities/segment-knowledge-component.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([DocumentTextSegment, Document, KnowledgeComponent, SegmentKeyphrase, SegmentKnowledgeComponent])],
  providers: [],
  exports: [],
})
export class DocumentModule {}
