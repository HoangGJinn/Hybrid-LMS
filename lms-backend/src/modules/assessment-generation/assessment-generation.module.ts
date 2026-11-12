import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
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
    ]),
  ],
  providers: [],
  exports: [],
})
export class AssessmentGenerationModule {}