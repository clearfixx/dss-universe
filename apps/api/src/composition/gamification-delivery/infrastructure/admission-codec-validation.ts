/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Codec
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/admission-codec-validation.ts
 * 🎯 Purpose: Copies bounded plain data without evaluating property accessors.
 * 🧠 Responsibilities: Enforces exact keys, dense arrays and UTF-8-safe scalar values.
 * 🏗️ Architecture: Codec-local shape validation, not owner eligibility policy.
 * ⚠️ Important: Call these before reading supplied object fields.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ADMISSION_STRING_MAX_BYTES } from '../contracts/consumption.constants';
import { AdmissionCodecError } from './admission-codec.error';

export function invalidSeal(): never {
  throw new AdmissionCodecError('INVALID_QUALIFIED_PROJECTION');
}
export function largeSeal(): never {
  throw new AdmissionCodecError('PROJECTION_TOO_LARGE');
}

export function exactRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== 'object') invalidSeal();
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalidSeal();
  const keys = Reflect.ownKeys(value);
  if (
    keys.length < required.length ||
    keys.length > required.length + optional.length
  )
    invalidSeal();
  const result: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of keys) {
    if (
      typeof key !== 'string' ||
      (!required.includes(key) && !optional.includes(key))
    )
      invalidSeal();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value')
    )
      invalidSeal();
    result[key] = descriptor.value;
  }
  if (required.some((key) => !Object.hasOwn(result, key))) invalidSeal();
  return result;
}

export function denseArray(
  value: unknown,
  maximum: number,
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length > maximum
  )
    invalidSeal();
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1) invalidSeal();
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value')
    )
      invalidSeal();
    result.push(descriptor.value);
  }
  return result;
}

export function sealText(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) invalidSeal();
  if (value.length > ADMISSION_STRING_MAX_BYTES) largeSeal();
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) invalidSeal();
    } else if (code >= 0xdc00 && code <= 0xdfff) invalidSeal();
  }
  if (Buffer.byteLength(value, 'utf8') > ADMISSION_STRING_MAX_BYTES)
    largeSeal();
  return value;
}

export function sealUuid(value: unknown): string {
  const text = sealText(value);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      text,
    )
  )
    invalidSeal();
  return text;
}

export function sealLiteral<T extends string | number | boolean | null>(
  value: unknown,
  expected: T,
): T {
  if (value !== expected) invalidSeal();
  return expected;
}

export function sealChoice<const T extends readonly string[]>(
  value: unknown,
  choices: T,
): T[number] {
  const text = sealText(value);
  if (!choices.includes(text)) invalidSeal();
  return text;
}
