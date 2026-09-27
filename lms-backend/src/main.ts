import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module.js'
import { AllExceptionsFilter } from './common/exceptions/all-exceptions.filter.js'
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js'
import { LoggerService } from './common/logger/logger.service.js'

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })
  
  // Use custom Winston logger
  app.useLogger(app.get(LoggerService))

  // Global prefix for all routes
  app.setGlobalPrefix('api')

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  // Global validation pipe — auto-validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter())

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor())

  const port = process.env.PORT ?? 9595
  await app.listen(port)
  app.get(LoggerService).log(`🚀 Server is running on http://localhost:${port}/api`)
}

await bootstrap()
