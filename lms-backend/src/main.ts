import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { LoggerService } from './common/logger/logger.service.js';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom Winston logger
  app.useLogger(app.get(LoggerService));

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Parse cookies from incoming requests for httpOnly auth cookies
  app.use(cookieParser());

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hybrid LMS API')
    .setDescription('Tài liệu API cho hệ thống Quản lý khóa học (Hybrid LMS)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Enable CORS for frontend & admin
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 9595;
  await app.listen(port);
  const logger = app.get(LoggerService);
  logger.log(`🚀 Server is running on http://localhost:${port}/api`);
  logger.log(`📚 Swagger UI is available at http://localhost:${port}/api/docs`);
};

await bootstrap();
