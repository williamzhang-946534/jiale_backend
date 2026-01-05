import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RedisService } from '../services/redis.service';

/**
 * 基于 X-Request-ID + Redis 的幂等中间件
 * 在 OrderModule 中配置到支付、取消、评价、退款等关键 POST 接口
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private readonly redis: RedisService) {}

  async use(req: any, res: Response, next: NextFunction) {
    if (req.method !== 'POST') return next();

    const id = req.header('X-Request-ID');
    if (!id) return next();

    // Redis 不可用时跳过幂等性检查
    if (!this.redis.isAvailable()) {
      return next();
    }

    const key = `idem:${req.method}:${req.originalUrl}:${id}`;
    const client = this.redis.getClient();

    try {
      const exists = await client.get(key);
      if (exists) {
        return res.json({
          code: 200,
          message: 'success',
          data: { idempotent: true },
        });
      }

      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        void client.set(key, '1', { PX: 10 * 60 * 1000 }).catch(() => {
          // 忽略设置幂等键时的错误
        });
        return originalJson(body);
      };

      next();
    } catch (error) {
      // Redis 操作失败时，降级为直接通过请求
      // eslint-disable-next-line no-console
      console.warn('[IdempotencyMiddleware] Redis operation failed, skipping idempotency check');
      next();
    }
  }
}


