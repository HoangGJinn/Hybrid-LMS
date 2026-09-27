import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export class MySQLDatabase {
  constructor(private readonly configService: ConfigService) {}

  getConnection(): TypeOrmModuleOptions {
    throw new Error('MySQL config is not implemented for LMS backend')
  }
}
