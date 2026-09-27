import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UserModule } from './modules/user/user.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { DatabaseModule } from './config/index.js'
import { LoggerModule } from './common/logger/logger.module.js'

@Module({
  imports: [
    // Load .env and config factories globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Common Modules
    LoggerModule,
    
    // Database
    DatabaseModule,
    UserModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
