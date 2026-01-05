import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DecimalUtils {
  add(a: Decimal, b: Decimal) {
    return a.plus(b);
  }

  sub(a: Decimal, b: Decimal) {
    return a.minus(b);
  }

  gte(a: Decimal, b: Decimal) {
    return a.greaterThanOrEqualTo(b);
  }

  lte(a: Decimal, b: Decimal) {
    return a.lessThanOrEqualTo(b);
  }
}


