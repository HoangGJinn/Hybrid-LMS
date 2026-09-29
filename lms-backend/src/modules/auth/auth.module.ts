import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import jwtConfig from './config/jwt.config.js'
import { UserModule } from '../user/user.module.js'
import { AuthService } from './services/auth.service.js'
import { TokenService } from './services/token.service.js'
import { GoogleAuthService } from './services/google-auth.service.js'
import { AuthController } from './controllers/auth.controller.js'
import { JwtStrategy } from './strategies/jwt.strategy.js'

@Module({
  imports: [
    UserModule,
    ConfigModule.forFeature(jwtConfig),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? '',
        signOptions: { expiresIn: (config.get<string>('jwt.expiresIn') ?? '7d') as `${number}${'s' | 'm' | 'h' | 'd'}` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, GoogleAuthService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
