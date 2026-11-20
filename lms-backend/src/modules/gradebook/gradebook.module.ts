import { Module } from '@nestjs/common';
import { AcademicModule } from '../academic/academic.module.js';
import { GradebookController } from './controllers/gradebook.controller.js';
import { GradebookRepository } from './repositories/gradebook.repository.js';
import { TypeOrmGradebookRepository } from './repositories/typeorm-gradebook.repository.js';
import { GradebookService } from './services/gradebook.service.js';

@Module({
  imports: [AcademicModule],
  controllers: [GradebookController],
  providers: [
    GradebookService,
    { provide: GradebookRepository, useClass: TypeOrmGradebookRepository },
  ],
})
export class GradebookModule {}