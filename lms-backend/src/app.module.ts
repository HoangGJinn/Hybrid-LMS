import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UserModule } from './modules/user/user.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { DatabaseModule } from './config/index.js'
import { LoggerModule } from './common/logger/logger.module.js'
import { CommonModule } from './common/common.module.js'
import { AcademicModule } from './modules/academic/academic.module.js'
import { AssessmentGenerationModule } from './modules/assessment-generation/assessment-generation.module.js'
import { AssignmentModule } from './modules/assignment/assignment.module.js'
import { ContentModule } from './modules/content/content.module.js'
import { DocumentModule } from './modules/document/document.module.js'
import { ExamModule } from './modules/exam/exam.module.js'
import { MasteryModule } from './modules/mastery/mastery.module.js'
import { RoadmapModule } from './modules/roadmap/roadmap.module.js'
import { FileModule } from './shared/file/file.module.js'
import { NotificationModule } from './shared/notification/notification.module.js'

import { validate } from './config/env.validation.js'

@Module({
  imports: [
    // Load .env and config factories globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    // Common Modules
    LoggerModule,
    CommonModule,
    
    // Database
    DatabaseModule,
    UserModule,
    AuthModule,
    AcademicModule,
    AssessmentGenerationModule,
    AssignmentModule,
    ContentModule,
    DocumentModule,
    ExamModule,
    MasteryModule,
    RoadmapModule,
    FileModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
