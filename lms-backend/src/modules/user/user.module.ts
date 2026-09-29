import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './entities/user.entity.js'
import { Student } from './entities/student.entity.js'
import { Lecturer } from './entities/lecturer.entity.js'
import { Admin } from './entities/admin.entity.js'
import { UserRepository } from './repositories/user.repository.js'
import { UserService } from './services/user.service.js'
import { UserController } from './controllers/user.controller.js'
import { UserFacade } from './facades/user.facade.js'

@Module({
  imports: [TypeOrmModule.forFeature([User, Student, Lecturer, Admin])],
  controllers: [UserController],
  providers: [UserRepository, UserService, UserFacade],
  exports: [UserFacade], // Export Facade instead of Service!
})
export class UserModule {}
