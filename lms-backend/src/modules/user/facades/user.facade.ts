import { Injectable } from '@nestjs/common'
import { UserService } from '../services/user.service.js'
import { User } from '../entities/user.entity.js'
import { CreateUserDto } from '../dto/create-user.dto.js'

/**
 * Facade pattern for inter-module communication.
 * Other modules (like AuthModule) should interact with UserFacade, NOT UserService.
 */
@Injectable()
export class UserFacade {
  constructor(private readonly userService: UserService) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    return this.userService.createUser(dto)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userService.findByEmail(email)
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userService.findByGoogleId(googleId)
  }

  async getUserById(id: string): Promise<User> {
    return this.userService.getUserById(id)
  }
}
