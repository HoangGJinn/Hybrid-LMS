import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import fs from 'fs';
import path from 'path';

export class PostgresDatabase {
  constructor(private readonly configService: ConfigService) { }

  getConnection(): TypeOrmModuleOptions {
    const caPath = path.resolve(
      process.cwd(),
      this.configService.get<string>('DATABASE_CA_PATH') ?? 'ca.pem',
    );
    const ssl = fs.existsSync(caPath)
      ? { rejectUnauthorized: true, ca: fs.readFileSync(caPath).toString() }
      : undefined;

    return {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST'),
      port: parseInt(
        this.configService.get<string>('DATABASE_PORT') ?? '5432',
        10,
      ),
      username: this.configService.get<string>('DATABASE_USER'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME'),
      ssl,
      extra: {
        max: 10,
        idleTimeoutMillis: 120000, // Tăng thời gian giữ kết nối rảnh lên 2 phút
        connectionTimeoutMillis: 10000, // Timeout kết nối 10s
        keepAlive: true,
      },
      // Auto-sync entities in development — TURN OFF in production!
      synchronize: process.env.NODE_ENV !== 'production',
      autoLoadEntities: true,
      logging: process.env.NODE_ENV !== 'production',
    };
  }
}
