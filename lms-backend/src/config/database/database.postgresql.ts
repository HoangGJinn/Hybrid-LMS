// import { ConfigService } from '@nestjs/config';
// import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// import fs from 'fs';
// import path from 'path';

// export class PostgresDatabase {
//   constructor(private readonly configService: ConfigService) { }

//   getConnection(): TypeOrmModuleOptions {
//     const caPath = path.resolve(
//       process.cwd(),
//       this.configService.get<string>('DATABASE_CA_PATH') ?? 'ca.pem',
//     );
//     const ssl = fs.existsSync(caPath)
//       ? { rejectUnauthorized: true, ca: fs.readFileSync(caPath).toString() }
//       : undefined;

//     return {
//       type: 'postgres',
//       host: this.configService.get<string>('DATABASE_HOST'),
//       port: parseInt(
//         this.configService.get<string>('DATABASE_PORT') ?? '5432',
//         10,
//       ),
//       username: this.configService.get<string>('DATABASE_USER'),
//       password: this.configService.get<string>('DATABASE_PASSWORD'),
//       database: this.configService.get<string>('DATABASE_NAME'),
//       ssl,
//       extra: {
//         max: 10,
//         idleTimeoutMillis: 120000,
//         connectionTimeoutMillis: 10000,
//         keepAlive: true,
//       },
//       // Auto-sync entities in development — TURN OFF in production!
//       synchronize: process.env.NODE_ENV !== 'production',
//       autoLoadEntities: true,
//       logging: process.env.NODE_ENV !== 'production',
//     };
//   }
// }


import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import fs from 'fs';
import path from 'path';

export class PostgresDatabase {
  constructor(private readonly configService: ConfigService) { }

  getConnection(): TypeOrmModuleOptions {
    const host = this.configService.get<string>('DATABASE_HOST');
    const isLocal = host === 'localhost' || host === '127.0.0.1';

    const caPath = path.resolve(
      process.cwd(),
      this.configService.get<string>('DATABASE_CA_PATH') || 'ca.pem',
    );
    const hasCa = fs.existsSync(caPath) && fs.statSync(caPath).isFile();
    const ssl = !isLocal && hasCa
      ? { rejectUnauthorized: true, ca: fs.readFileSync(caPath).toString() }
      : undefined;

    return {
      type: 'postgres',
      host,
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
        idleTimeoutMillis: 120000,
        connectionTimeoutMillis: 10000,
        keepAlive: true,
      },
      // Chỉ tự sync schema trên DB local.
      synchronize: isLocal && process.env.NODE_ENV !== 'production',
      autoLoadEntities: true,
      logging: process.env.NODE_ENV !== 'production',
    };
  }
}