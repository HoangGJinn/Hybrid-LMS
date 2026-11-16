import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../../shared/file/file.module.js';
import { Subject } from '../academic/entities/subject.entity.js';
import { KnowledgeComponent } from '../document/entities/knowledge-component.entity.js';
import { QuestionImportController } from './controllers/question-import.controller.js';
import { QuestionManagementController } from './controllers/question-management.controller.js';
import { QuizController } from './controllers/quiz.controller.js';
import { GenerationJob } from './entities/generation-job.entity.js';
import { LlmPromptLog } from './entities/llm-prompt-log.entity.js';
import { QuestionImportBatch } from './entities/question-import-batch.entity.js';
import { QuestionKnowledgeComponent } from './entities/question-knowledge-component.entity.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { Question } from './entities/question.entity.js';
import { QuizInstanceAnswer } from './entities/quiz-instance-answer.entity.js';
import { QuizInstanceQuestion } from './entities/quiz-instance-question.entity.js';
import { QuizInstance } from './entities/quiz-instance.entity.js';
import { QuizResultExport } from './entities/quiz-result-export.entity.js';
import { QuestionImportFileAdapter } from './services/question-import-file.adapter.js';
import { QuestionImportLocalFileAdapter } from './services/question-import-local-file.adapter.js';
import { QuestionImportService } from './services/question-import.service.js';
import { QuestionManagementService } from './services/question-management.service.js';
import { QuizService } from './services/quiz.service.js';
import { RuleBasedQuestionSelector } from './services/rule-based-question-selector.service.js';
import { QUESTION_IMPORT_FILE_PORT } from './types/question-import-file.port.js';
import { QUESTION_SELECTOR } from './types/question-selector.type.js';

@Module({
  imports: [
    // FileModule exports FileFacade: the import adapter reads the uploaded Excel through it.
    FileModule,
    TypeOrmModule.forFeature([
      GenerationJob,
      LlmPromptLog,
      QuestionImportBatch,
      Question,
      QuestionOption,
      QuestionKnowledgeComponent,
      QuizInstance,
      QuizInstanceQuestion,
      QuizInstanceAnswer,
      QuizResultExport,
      // Owned by other modules; registered here so the services can inject their repositories.
      Subject,
      KnowledgeComponent,
    ]),
  ],
  controllers: [QuestionImportController, QuestionManagementController, QuizController],
  providers: [
    QuestionImportService,
    QuestionManagementService,
    QuizService,
    // Swap this for a model-backed selector (ENAS-KT) later; nothing else in the quiz flow changes.
    { provide: QUESTION_SELECTOR, useClass: RuleBasedQuestionSelector },
    // QUESTION_IMPORT_USE_LOCAL_FILES=true reads ./dev-uploads instead of S3 (never in production).
    {
      provide: QUESTION_IMPORT_FILE_PORT,
      useClass:
        process.env.QUESTION_IMPORT_USE_LOCAL_FILES === 'true'
          ? QuestionImportLocalFileAdapter
          : QuestionImportFileAdapter,
    },
  ],
  exports: [],
})
export class AssessmentGenerationModule {}