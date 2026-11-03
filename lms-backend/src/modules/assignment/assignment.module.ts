import { Module } from '@nestjs/common';
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
import { AssignmentService } from './services/assignment.service.js';
import { SubmissionReviewService } from './services/submission-review.service.js';
import { SubmissionService } from './services/submission.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentFile,
      AssignmentSubmissionFile,
      AssignmentSubmission,
      Assignment,
    ]),
    AcademicModule,
    ContentModule,
    FileModule,
  ],
  controllers: [AssignmentController, MyAssignmentsController],
  providers: [
    AssignmentRepository,
    SubmissionRepository,
    SubmissionService,
    SubmissionReviewService,
    AssignmentService,
  ],
  exports: [],
})
export class AssignmentModule {}