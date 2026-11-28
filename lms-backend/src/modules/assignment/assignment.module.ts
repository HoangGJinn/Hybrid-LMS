import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../../shared/file/file.module.js';
import { AcademicModule } from '../academic/academic.module.js';
import { ContentModule } from '../content/content.module.js';
import { AssignmentController } from './controllers/assignment.controller.js';
import { MyAssignmentsController } from './controllers/my-assignments.controller.js';
import { AssignmentFile } from './entities/assignment-file.entity.js';
import { AssignmentSubmissionFile } from './entities/assignment-submission-file.entity.js';
import { AssignmentSubmission } from './entities/assignment-submission.entity.js';
import { Assignment } from './entities/assignment.entity.js';
import { AssignmentRepository } from './repositories/assignment.repository.js';
import { SubmissionRepository } from './repositories/submission.repository.js';
import { AssignmentCleanupService } from './services/assignment-cleanup.service.js';
import { AssignmentExportService } from './services/assignment-export.service.js';
import { AssignmentService } from './services/assignment.service.js';
import { SubmissionReviewService } from './services/submission-review.service.js';
import { SubmissionService } from './services/submission.service.js';
import { ZaloModule } from '../zalo/index.js';
import { AssignmentFacade } from './facades/assignment.facade.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentFile,
      AssignmentSubmissionFile,
      AssignmentSubmission,
      Assignment,
    ]),
    AcademicModule,
    forwardRef(() => ContentModule),
    FileModule,
    ZaloModule,
  ],
  controllers: [AssignmentController, MyAssignmentsController],
  providers: [
    AssignmentRepository,
    SubmissionRepository,
    SubmissionService,
    SubmissionReviewService,
    AssignmentService,
    AssignmentExportService,
    AssignmentCleanupService,
    AssignmentFacade,
  ],
  exports: [AssignmentFacade],
})
export class AssignmentModule {}