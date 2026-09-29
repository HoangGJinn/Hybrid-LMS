import { Module, ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js'
import { ResponseInterceptor } from './interceptors/response.interceptor.js'

@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { 
      provide: APP_PIPE, 
      useValue: new ValidationPipe({ 
        whitelist: true, 
        forbidNonWhitelisted: true, 
        transform: true 
      }) 
    },
  ],
})
export class CommonModule {}
