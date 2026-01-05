import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const traceId = req.headers['x-trace-id'] || uuid();
    req.traceId = traceId;

    const started = Date.now();
    return next.handle().pipe(
      tap(() => {
        const userId = req.user?.id;
        // eslint-disable-next-line no-console
        console.log(
          '[REQ]',
          traceId,
          req.method,
          req.originalUrl,
          'userId=',
          userId,
          'time=',
          Date.now() - started,
          'ms',
        );
      }),
    );
  }
}


