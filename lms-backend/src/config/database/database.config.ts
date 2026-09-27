import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { MySQLDatabase } from './database.mysql.js'
import { PostgresDatabase } from './database.postgresql.js'

export class DatabaseFactory {
  static createDatabaseConnection(
    dbType: string,
    configService: ConfigService,
  ): TypeOrmModuleOptions {
    switch (dbType) {
      case 'postgres':
        return new PostgresDatabase(configService).getConnection()
      case 'mysql':
        return new MySQLDatabase(configService).getConnection()
      default:
        throw new Error('Unsupported database type')
    }
  }
}
