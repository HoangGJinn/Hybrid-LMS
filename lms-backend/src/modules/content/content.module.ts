import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemCompletion } from './entities/item-completion.entity.js';
import { SectionItem } from './entities/section-item.entity.js';
import { Section } from './entities/section.entity.js';
import { AcademicModule } from '../academic/academic.module.js'
import { SectionController } from './controllers/section.controller.js'
import { SectionRepository } from './repositories/section.repository.js'
import { SectionService } from './services/section.service.js'
import { ContentFacade } from './facades/content.facade.js';
import { DocumentItemRepository } from './repositories/document-item.repository.js';
import { ClassDocumentService } from './services/class-document.service.js';
import { ClassAssignmentService } from './services/class-assignment.service.js';
import { AssignmentItemRepository } from './repositories/assignment-item.repository.js';
import { ExamItemRepository } from './repositories/exam-item.repository.js';
import { ClassExamService } from './services/class-exam.service.js';
import { ExamSchedule } from '../exam/entities/exam-schedule.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
          ItemCompletion,
          SectionItem,
          Section,
          ExamSchedule,
        ]),
    AcademicModule,
  ],
  controllers: [SectionController],
    providers: [
    SectionRepository,
    DocumentItemRepository,
    AssignmentItemRepository,
    ExamItemRepository,
    SectionService,
    ClassDocumentService,
    ClassAssignmentService,
    ClassExamService,
    ContentFacade,
  ],
  exports: [ContentFacade],
})
export class ContentModule {}
