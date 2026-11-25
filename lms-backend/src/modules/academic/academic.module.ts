import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassStudent } from './entities/class-student.entity.js';
import { Class } from './entities/class.entity.js';
import { Semester } from './entities/semester.entity.js';
import { Subject } from './entities/subject.entity.js';
import { ClassRepository } from './repositories/class.repository.js';
import { ClassStudentRepository } from './repositories/class-student.repository.js';
import { ClassAccessPolicy } from './policies/class-access.policy.js';
import { SubjectRepository } from './repositories/subject.repository.js';
import { SemesterRepository } from './repositories/semester.repository.js';
import { ClassService } from './services/class.service.js';
import { ClassImportService } from './services/class-import.service.js';
import { ClassDataImportService } from './services/class-data-import.service.js';
import { ClassExportService } from './services/class-export.service.js';
import { ParticipantService } from './services/participant.service.js';
import { SubjectService } from './services/subject.service.js';
import { SemesterService } from './services/semester.service.js';
import { ClassController } from './controllers/class.controller.js';
import { LecturerDashboardController } from './controllers/lecturer-dashboard.controller.js';
import { ParticipantController } from './controllers/participant.controller.js';
import { StudentDashboardController } from './controllers/student-dashboard.controller.js';
import { SubjectController } from './controllers/subject.controller.js';
import { SemesterController } from './controllers/semester.controller.js';
import { AcademicFacade } from './facades/academic.facade.js';
import { LecturerDashboardRepository } from './repositories/lecturer-dashboard.repository.js';
import { LecturerDashboardService } from './services/lecturer-dashboard.service.js';
import { StudentDashboardRepository } from './repositories/student-dashboard.repository.js';
import { StudentDashboardService } from './services/student-dashboard.service.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassStudent, Class, Semester, Subject]),
    UserModule,
  ],
  controllers: [
    ClassController,
    LecturerDashboardController,
    ParticipantController,
    StudentDashboardController,
    SubjectController,
    SemesterController,
  ],
  providers: [
    ClassRepository,
    ClassStudentRepository,
    SubjectRepository,
    SemesterRepository,
    LecturerDashboardRepository,
    StudentDashboardRepository,
    ClassAccessPolicy,
    ClassService,
    ClassImportService,
    ClassDataImportService,
    ClassExportService,
    ParticipantService,
    SubjectService,
    SemesterService,
    LecturerDashboardService,
    StudentDashboardService,
    AcademicFacade,
  ],
  exports: [AcademicFacade],
})
export class AcademicModule {}