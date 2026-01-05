import { Injectable } from '@nestjs/common';

@Injectable()
export class SensitiveDataMasker {
  maskPhone(phone?: string | null) {
    if (!phone) return phone;
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  }

  maskAddress(addr?: string | null) {
    if (!addr) return addr;
    if (addr.length <= 6) return '***';
    return `${addr.slice(0, 6)}***`;
  }

  maskRequest(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const clone = JSON.parse(JSON.stringify(body));
    if (clone.phone) clone.phone = this.maskPhone(clone.phone);
    if (clone.address) clone.address = this.maskAddress(clone.address);
    return clone;
  }
}


