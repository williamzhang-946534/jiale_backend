import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const schema: ZodSchema | undefined = (metadata as any).metatype?.zodSchema;
    if (!schema) return value;

    const result = schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: result.error.errors.map((e) => e.message).join('; '),
      });
    }
    return result.data;
  }
}


