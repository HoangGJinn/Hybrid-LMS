import { plainToInstance } from 'class-transformer'
import { IsEnum, IsNumber, IsString, validateSync, IsOptional } from 'class-validator'

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development

  @IsNumber()
  @IsOptional()
  PORT: number = 9595

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000'

  @IsString()
  DATABASE_HOST: string

  @IsNumber()
  DATABASE_PORT: number

  @IsString()
  DATABASE_USER: string

  @IsString()
  DATABASE_PASSWORD: string

  @IsString()
  DATABASE_NAME: string

  @IsString()
  @IsOptional()
  DATABASE_CA_PATH: string

  @IsString()
  JWT_SECRET: string

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d'

  @IsString()
  GOOGLE_CLIENT_ID: string
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })
  const errors = validateSync(validatedConfig, { skipMissingProperties: false })

  if (errors.length > 0) {
    throw new Error(errors.toString())
  }
  return validatedConfig
}
