import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class TotpService {
  constructor(private readonly config: ConfigService) {}

  createSecret(): string {
    return this.base32(randomBytes(20));
  }

  verify(secret: string, code: string, now = Date.now()): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    return [-1, 0, 1].some((offset) => {
      const expected = this.code(secret, Math.floor(now / 30_000) + offset);
      return timingSafeEqual(Buffer.from(code), Buffer.from(expected));
    });
  }

  code(secret: string, counter: number): string {
    const value = Buffer.alloc(8);
    value.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', this.decodeBase32(secret))
      .update(value)
      .digest();
    const offset = (digest.at(-1) ?? 0) & 0x0f;
    const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
    return binary.toString().padStart(6, '0');
  }

  encrypt(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), ciphertext]
      .map((value) => value.toString('base64url'))
      .join('.');
  }

  decrypt(payload: string): string {
    const [iv, tag, ciphertext] = payload
      .split('.')
      .map((value) => Buffer.from(value ?? '', 'base64url'));
    if (!iv || !tag || !ciphertext || iv.length !== 12 || tag.length !== 16) {
      throw new Error('Invalid encrypted 2FA secret.');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  recoveryCode(): string {
    return `${randomBytes(3).toString('hex')}-${randomBytes(3).toString('hex')}`;
  }

  recoveryHash(code: string): string {
    return createHmac('sha256', this.key())
      .update(`recovery:${code.trim().toLowerCase()}`)
      .digest('hex');
  }

  private key(): Buffer {
    return createHash('sha256')
      .update(this.config.getOrThrow<string>('AUTH_2FA_ENCRYPTION_KEY'))
      .digest();
  }

  private base32(value: Buffer): string {
    let bits = '';
    for (const byte of value) bits += byte.toString(2).padStart(8, '0');
    let result = '';
    for (let index = 0; index < bits.length; index += 5) {
      const chunk = bits.slice(index, index + 5).padEnd(5, '0');
      result += ALPHABET[Number.parseInt(chunk, 2)];
    }
    return result;
  }

  private decodeBase32(value: string): Buffer {
    let bits = '';
    for (const character of value.replaceAll('=', '').toUpperCase()) {
      const index = ALPHABET.indexOf(character);
      if (index < 0) throw new Error('Invalid TOTP secret.');
      bits += index.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let index = 0; index + 8 <= bits.length; index += 8) {
      bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
    }
    return Buffer.from(bytes);
  }
}
