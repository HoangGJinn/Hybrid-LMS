import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { Student } from '../entities/student.entity.js';
import { Lecturer } from '../entities/lecturer.entity.js';
import { Admin } from '../entities/admin.entity.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { Role } from '../../../common/enums/role.enum.js';
import { StudentStatus } from '../enums/student-status.enum.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';

/** Encapsulates database operations for the User aggregate (User + Student/Lecturer/Admin profiles). */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Lecturer)
    private readonly lecturerRepo: Repository<Lecturer>,
  ) {}

  async createUserWithProfile(dto: CreateUserDto): Promise<User> {
    const role = dto.role ?? Role.STUDENT;

    return this.userRepo.manager.transaction(async (manager) => {
      // 1. Create User record
      const user = manager.create(User, {
        email: dto.email,
        fullName: dto.fullName,
        ssoId: dto.ssoId,
        ssoProvider: dto.ssoProvider,
        avatarUrl: dto.avatarUrl ?? null,
        role,
      });
      const savedUser = await manager.save(user);

      // 2. Auto-create corresponding role profile
      if (role === Role.ADMIN) {
        const admin = manager.create(Admin, { userId: savedUser.id });
        await manager.save(admin);
      } else if (role === Role.LECTURER) {
        const lecturerCode = `GV${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
        const lecturer = manager.create(Lecturer, {
          userId: savedUser.id,
          lecturerCode,
          status: LecturerStatus.WORKING,
        });
        await manager.save(lecturer);
      } else {
        const studentCode = `SV${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
        const student = manager.create(Student, {
          userId: savedUser.id,
          studentCode,
          status: StudentStatus.STUDYING,
        });
        await manager.save(student);
      }

      return savedUser;
    });
  }

  /** Backwards compatibility alias */
  async createUserWithStudentProfile(dto: CreateUserDto): Promise<User> {
    return this.createUserWithProfile(dto);
  }

  /** Student code or lecturer code of the user; null for users without such a profile (e.g. admins). */
  async findProfileCode(userId: string): Promise<string | null> {
    const student = await this.studentRepo.findOneBy({ userId });
    if (student) return student.studentCode;
    const lecturer = await this.lecturerRepo.findOneBy({ userId });
    return lecturer?.lecturerCode ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findBySsoId(ssoId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { ssoId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async updateSsoLink(
    id: string,
    data: { ssoId: string; ssoProvider: string; avatarUrl: string | null },
  ): Promise<User> {
    await this.userRepo.update(id, {
      ssoId: data.ssoId,
      ssoProvider: data.ssoProvider,
      avatarUrl: data.avatarUrl ?? undefined,
    });
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  async findByRole(role?: Role): Promise<User[]> {
    const where = role ? { role, isActive: true } : { isActive: true };
    return this.userRepo.find({ where, order: { fullName: 'ASC' } });
  }
}
