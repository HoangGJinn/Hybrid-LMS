import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common'
import * as winston from 'winston'
import 'winston-daily-rotate-file'

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger

  constructor() {
    const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    })

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        dailyRotateFileTransport,
      ],
    })
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, optionalParams)
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, optionalParams)
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, optionalParams)
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, optionalParams)
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, optionalParams)
  }
}
