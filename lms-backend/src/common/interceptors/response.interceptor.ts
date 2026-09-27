import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface StandardResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  timestamp: string
}

/** 
 * Intercepts all successful responses and formats them 
 * to match the error format in AllExceptionsFilter. 
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const ctx = context.switchToHttp()
    const response = ctx.getResponse()
    const statusCode = response.statusCode

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        message: 'Success',
        data,
        timestamp: new Date().toISOString(),
      })),
    )
  }
}
