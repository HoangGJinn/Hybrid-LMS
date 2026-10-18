import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/test (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/test')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBe('Auth module OK');
  });

  afterEach(async () => {
    await app.close();
  });
});
