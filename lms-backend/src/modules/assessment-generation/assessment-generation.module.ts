import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GenerationJob } from './entities/generation-job.entity.js'
import { LlmPromptLog } from './entities/llm-prompt-log.entity.js'
import { QuestionDistraction } from './entities/question-distraction.entity.js'
import { QuizInstanceAnswer } from './entities/quiz-instance-answer.entity.js'
import { QuizInstanceQuestion } from './entities/quiz-instance-question.entity.js'
import { QuizInstance } from './entities/quiz-instance.entity.js'
import { QuizResultExport } from './entities/quiz-result-export.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([GenerationJob, LlmPromptLog, QuestionDistraction, QuizInstanceAnswer, QuizInstanceQuestion, QuizInstance, QuizResultExport])],
  providers: [],
  exports: [],
})
export class AssessmentGenerationModule {}
