import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
  IsOptional,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum CookieSameSite {
  Strict = 'strict',
  Lax = 'lax',
  None = 'none',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 9595;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  ADMIN_URL: string = 'http://localhost:3001';

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  @IsOptional()
  DATABASE_CA_PATH: string;

  @IsString()
  JWT_SECRET: string;

  @IsNumber()
  @IsOptional()
  ACCESS_TOKEN_TTL: number = 1800;

  @IsNumber()
  @IsOptional()
  REFRESH_TOKEN_TTL: number = 1209600000;

  /** Default: strict in production, lax otherwise. Use `none` only when the frontend and the API are on different sites. */
  @IsEnum(CookieSameSite)
  @IsOptional()
  REFRESH_COOKIE_SAME_SITE?: CookieSameSite;

  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  ADMIN_EMAILS?: string;

  @IsString()
  @IsOptional()
  AWS_REGION: string = 'ap-southeast-1';

  /** Private bucket that holds every uploaded file; it is only ever reached through presigned URLs. */
  @IsString()
  S3_BUCKET_NAME: string;

  /** Lifetime of a presigned download URL; keep it short (10-15 minutes). */
  @IsNumber()
  @IsOptional()
  S3_DOWNLOAD_URL_TTL: number = 900;

  /** Lifetime of a presigned upload form, in seconds; it only has to cover one upload. */
  @IsNumber()
  @IsOptional()
  S3_UPLOAD_URL_TTL: number = 600;

  /** Optional: when absent the AWS SDK default credential chain (for example an IAM role) is used. */
  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
