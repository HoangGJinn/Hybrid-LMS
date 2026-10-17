import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module.js'
import { LoggerService } from './common/logger/logger.service.js'

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })
  
  // Use custom Winston logger
  app.useLogger(app.get(LoggerService))

  // Global prefix for all routes
  app.setGlobalPrefix('api')

  // Parse cookies from incoming requests for httpOnly auth cookies
  app.use(cookieParser())

  // Enable CORS for frontend
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean) as string[]

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  const port = process.env.PORT ?? 9595
  await app.listen(port)
  app.get(LoggerService).log(`🚀 Server is running on http://localhost:${port}/api`)
}

await bootstrap()
