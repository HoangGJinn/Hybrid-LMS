import { Injectable } from '@nestjs/common'
import { UserService } from '../services/user.service.js'
import { UserView } from '../types/user-view.type.js'
import { CreateUserDto } from '../dto/create-user.dto.js'

/**
 * Facade pattern for inter-module communication.
 * Other modules (like AuthModule) MUST interact via UserFacade, NOT UserService directly.
 * Only UserView (read-only projection) is exposed — never raw User entities.
 */
@Injectable()
export class UserFacade {
  constructor(private readonly userService: UserService) {}

  async createUser(dto: CreateUserDto): Promise<UserView> {
    const user = await this.userService.createUser(dto)
    return UserView.fromEntity(user)
  }

  async findByEmail(email: string): Promise<UserView | null> {
    const user = await this.userService.findByEmail(email)
    return user ? UserView.fromEntity(user) : null
  }

  async findBySsoId(ssoId: string): Promise<UserView | null> {
    const user = await this.userService.findBySsoId(ssoId)
    return user ? UserView.fromEntity(user) : null
  }

  async getUserById(id: string): Promise<UserView> {
    const user = await this.userService.getUserById(id)
    return UserView.fromEntity(user)
  }

  async linkSso(
    id: string,
    data: { ssoId: string; ssoProvider: string; avatarUrl: string | null },
  ): Promise<UserView> {
    const user = await this.userService.linkSso(id, data)
    return UserView.fromEntity(user)
  }
}
