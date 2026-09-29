import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity.js'
import { Student } from '../entities/student.entity.js'
import { CreateUserDto } from '../dto/create-user.dto.js'

/** Encapsulates database operations for the User aggregate (User + Student/Lecturer/Admin profiles). */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  async createUserWithStudentProfile(dto: CreateUserDto): Promise<User> {
    return this.userRepo.manager.transaction(async (manager) => {
      // 1. Create User record
      const user = manager.create(User, {
        email: dto.email,
        fullName: dto.fullName,
        ssoId: dto.ssoId,
        ssoProvider: dto.ssoProvider,
        avatarUrl: dto.avatarUrl ?? null,
        role: dto.role ?? undefined,
      })
      const savedUser = await manager.save(user)

      // 2. Auto-create Student profile (default role)
      const student = manager.create(Student, { userId: savedUser.id })
      await manager.save(student)

      return savedUser
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } })
  }

  async findBySsoId(ssoId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { ssoId } })
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } })
  }

  async updateSsoLink(
    id: string,
    data: { ssoId: string; ssoProvider: string; avatarUrl: string | null },
  ): Promise<User> {
    await this.userRepo.update(id, {
      ssoId: data.ssoId,
      ssoProvider: data.ssoProvider,
      avatarUrl: data.avatarUrl ?? undefined,
    })
    return this.userRepo.findOneOrFail({ where: { id } })
  }
}
