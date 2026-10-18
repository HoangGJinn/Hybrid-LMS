import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassStudent } from './entities/class-student.entity.js';
import { Class } from './entities/class.entity.js';
import { Semester } from './entities/semester.entity.js';
import { Subject } from './entities/subject.entity.js';
import { ClassRepository } from './repositories/class.repository.js';
import { SubjectRepository } from './repositories/subject.repository.js';
import { SemesterRepository } from './repositories/semester.repository.js';
import { ClassService } from './services/class.service.js';
import { SubjectService } from './services/subject.service.js';
import { SemesterService } from './services/semester.service.js';
import { ClassController } from './controllers/class.controller.js';
import { SubjectController } from './controllers/subject.controller.js';
import { SemesterController } from './controllers/semester.controller.js';
import { AcademicFacade } from './facades/academic.facade.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassStudent, Class, Semester, Subject]),
    UserModule,
  ],
  controllers: [ClassController, SubjectController, SemesterController],
  providers: [
    ClassRepository,
    SubjectRepository,
    SemesterRepository,
    ClassService,
    SubjectService,
    SemesterService,
    AcademicFacade,
  ],
  exports: [AcademicFacade],
})
export class AcademicModule {}
