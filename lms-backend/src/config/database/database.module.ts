import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DatabaseFactory } from './database.config.js'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // By default, our LMS uses postgres, but this makes it flexible
        const dbType = config.get<string>('DB_TYPE') ?? 'postgres'
        return DatabaseFactory.createDatabaseConnection(dbType, config)
      },
    }),
  ],
})
export class DatabaseModule {}
