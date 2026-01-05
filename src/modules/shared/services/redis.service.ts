import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    this.client.on('connect', () => {
      this.isConnected = true;
      // eslint-disable-next-line no-console
      console.log('[Redis] Connected successfully');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      // eslint-disable-next-line no-console
      console.error('[Redis] Connection error:', err.message);
    });

    this.client.connect().catch((err) => {
      // 启动失败时仅记录日志，避免影响整体启动
      // 具体告警可接入监控
      // eslint-disable-next-line no-console
      console.error('[Redis] connect error', err);
    });
  }

  getClient() {
    return this.client;
  }

  isAvailable(): boolean {
    return this.isConnected;
  }

  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    if (!this.isConnected) {
      // Redis 不可用时直接执行函数，不进行锁控制
      // eslint-disable-next-line no-console
      console.warn('[Redis] Service unavailable, executing without lock');
      return await fn();
    }

    const lockKey = `lock:${key}`;
    try {
      const acquired = await this.client.set(lockKey, '1', {
        NX: true,
        PX: ttlMs,
      });
      if (!acquired) return null;
      try {
        return await fn();
      } finally {
        await this.client.del(lockKey).catch(() => {
          // 忽略删除锁时的错误
        });
      }
    } catch (error) {
      // Redis 操作失败时，降级为直接执行
      // eslint-disable-next-line no-console
      console.warn('[Redis] Lock operation failed, executing without lock:', error);
      return await fn();
    }
  }

  async incrWithExpire(key: string, ttlSec: number): Promise<number> {
    if (!this.isConnected) {
      // Redis 不可用时返回 1（模拟首次调用）
      return 1;
    }

    try {
      const val = await this.client.incr(key);
      if (val === 1) {
        await this.client.expire(key, ttlSec);
      }
      return val;
    } catch (error) {
      // Redis 操作失败时返回 1
      // eslint-disable-next-line no-console
      console.warn('[Redis] Incr operation failed:', error);
      return 1;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.client.quit().catch(() => {
        // 忽略关闭时的错误
      });
    }
  }
}


