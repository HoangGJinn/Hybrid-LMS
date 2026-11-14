import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validate } from './env.validation.js';

describe('env.validation', () => {
  const validConfig = {
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_USER: 'postgres',
    DATABASE_PASSWORD: 'secret',
    DATABASE_NAME: 'hybrid_lms',
    JWT_SECRET: 'super-secret-jwt-key',
    GOOGLE_CLIENT_ID: 'client-id',
    S3_BUCKET_NAME: 'lms-bucket',
  };

  it('validates and transforms valid configuration with defaults', () => {
    const result = validate(validConfig);
    expect(result.PORT).toBe(9595);
    expect(result.DATABASE_PORT).toBe(5432);
    expect(result.AWS_REGION).toBe('ap-southeast-1');
  });

  it('throws an Error when required variables are missing or invalid', () => {
    expect(() => validate({ NODE_ENV: 'invalid-env' })).toThrow();
  });
});

