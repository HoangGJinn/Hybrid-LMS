import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StudentCompetencyHistory } from './entities/student-competency-history.entity.js'
import { StudentKcMastery } from './entities/student-kc-mastery.entity.js'
import { StudentKcReviewSchedule } from './entities/student-kc-review-schedule.entity.js'
import { StudentSubjectCompetency } from './entities/student-subject-competency.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([StudentCompetencyHistory, StudentKcMastery, StudentKcReviewSchedule, StudentSubjectCompetency])],
  providers: [],
  exports: [],
})
export class MasteryModule {}
