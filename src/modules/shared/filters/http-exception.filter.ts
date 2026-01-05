import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiResponse } from '../types/api-response';
import { SensitiveDataMasker } from '../utils/sensitive-data-masker';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly masker: SensitiveDataMasker) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp
      ? (exception as HttpException).getResponse()
      : null;

    const message =
      (responseBody as any)?.message ||
      (isHttp ? (exception as HttpException).message : 'Internal server error');

    const body: ApiResponse<null> = {
      code: status,
      message,
      data: null,
    };

    const safeBody = this.masker.maskRequest(req.body);
    // eslint-disable-next-line no-console
    console.error(
      '[ERROR]',
      status,
      req.method,
      req.originalUrl,
      safeBody,
    );

    res.status(status).json(body);
  }
}


