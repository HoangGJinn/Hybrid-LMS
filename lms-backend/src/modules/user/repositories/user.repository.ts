import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity.js'
import { CreateUserDto } from '../dto/create-user.dto.js'

/** Encapsulates database operations for the User entity. */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async createAndSave(dto: CreateUserDto): Promise<User> {
    const user = this.repository.create(dto)
    return this.repository.save(user)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } })
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.repository.findOne({ where: { googleId } })
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } })
  }
}
