import { Injectable, NotFoundException } from '@nestjs/common'
import { User } from '../entities/user.entity.js'
import { UserRepository } from '../repositories/user.repository.js'
import { CreateUserDto } from '../dto/create-user.dto.js'

/** Handles business logic for the User module. */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    // Always creates User + Student profile in one transaction (default role = STUDENT)
    return this.userRepository.createUserWithStudentProfile(dto)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email)
  }

  async findBySsoId(ssoId: string): Promise<User | null> {
    return this.userRepository.findBySsoId(ssoId)
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id)
    if (!user) throw new NotFoundException(`User #${id} not found`)
    return user
  }

  async linkSso(
    id: string,
    data: { ssoId: string; ssoProvider: string; avatarUrl: string | null },
  ): Promise<User> {
    return this.userRepository.updateSsoLink(id, data)
  }
}
