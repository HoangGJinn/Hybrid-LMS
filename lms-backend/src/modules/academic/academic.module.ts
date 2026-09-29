import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ClassStudent } from './entities/class-student.entity.js'
import { Class } from './entities/class.entity.js'
import { Semester } from './entities/semester.entity.js'
import { Subject } from './entities/subject.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([ClassStudent, Class, Semester, Subject])],
  providers: [],
  exports: [],
})
export class AcademicModule {}
