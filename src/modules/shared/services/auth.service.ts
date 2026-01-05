import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';

export type JwtPayload = {
  sub: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  signToken(userId: string, role: JwtPayload['role']) {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwt.sign(payload);
  }

  async validateUser(payload: JwtPayload) {
    if (payload.role === 'ADMIN') {
      return this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    }
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }
}


