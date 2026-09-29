import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AssignmentFile } from './entities/assignment-file.entity.js'
import { AssignmentSubmissionFile } from './entities/assignment-submission-file.entity.js'
import { AssignmentSubmission } from './entities/assignment-submission.entity.js'
import { Assignment } from './entities/assignment.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([AssignmentFile, AssignmentSubmissionFile, AssignmentSubmission, Assignment])],
  providers: [],
  exports: [],
})
export class AssignmentModule {}
