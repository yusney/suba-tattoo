export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_MAX_LENGTHS = {
  name: 100,
  email: 200,
  body: 5000,
  style: 200,
  description: 5000,
} as const;

export const BOOKING_MAX_LENGTHS = {
  nombre: 100,
  email: 200,
  telefono: 50,
  estilo: 200,
  zona: 200,
  tamano: 200,
  fecha: 50,
  descripcion: 5000,
} as const;

export const CONTACT_REQUIRED = ["name", "email"] as const;
export const CONTACT_OPTIONAL = ["body", "style", "description"] as const;
export const BOOKING_REQUIRED = ["nombre", "email", "telefono"] as const;
export const BOOKING_OPTIONAL = ["estilo", "zona", "tamano", "fecha", "descripcion"] as const;

export type FieldErrorReason = "missing" | "invalid_type" | "invalid_format" | "too_long";

export interface FieldError {
  field: string;
  reason: FieldErrorReason;
  max?: number;
}

export interface ContactPayload {
  name?: unknown;
  email?: unknown;
  body?: unknown;
  style?: unknown;
  description?: unknown;
}

export interface BookingPayload {
  nombre?: unknown;
  email?: unknown;
  telefono?: unknown;
  estilo?: unknown;
  zona?: unknown;
  tamano?: unknown;
  fecha?: unknown;
  descripcion?: unknown;
}

const PHONE_STRIP_RE = /[\s+\-()]/g;
const PHONE_DIGIT_RE = /\d/g;

function isValidPhone(value: string): boolean {
  const stripped = value.replace(PHONE_STRIP_RE, "");
  const digitCount = (stripped.match(PHONE_DIGIT_RE) ?? []).length;
  return digitCount >= 6;
}

function isValidDateString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return !Number.isNaN(Date.parse(trimmed));
}

function checkString(value: unknown): { ok: true; value: string } | { ok: false; reason: FieldErrorReason } {
  if (value === undefined || value === null) return { ok: false, reason: "missing" };
  if (typeof value !== "string") return { ok: false, reason: "invalid_type" };
  return { ok: true, value };
}

function pushLengthOrMissing(
  errors: FieldError[],
  field: string,
  value: string,
  opts: { required: boolean; max?: number }
): void {
  const trimmed = value.trim();
  if (!trimmed) {
    if (opts.required) errors.push({ field, reason: "missing" });
    return;
  }
  if (typeof opts.max === "number" && trimmed.length > opts.max) {
    errors.push({ field, reason: "too_long", max: opts.max });
  }
}

function pushInvalidFormatIfMissing(errors: FieldError[], field: string, reason: FieldErrorReason): void {
  if (!errors.some((e) => e.field === field)) errors.push({ field, reason });
}

export function validateContact(payload: ContactPayload): FieldError[] {
  const errors: FieldError[] = [];

  for (const field of CONTACT_REQUIRED) {
    const check = checkString(payload[field]);
    if (!check.ok) {
      errors.push({ field, reason: check.reason });
      continue;
    }
    pushLengthOrMissing(errors, field, check.value, {
      required: true,
      max: CONTACT_MAX_LENGTHS[field],
    });
  }

  for (const field of CONTACT_OPTIONAL) {
    const check = checkString(payload[field]);
    if (!check.ok) {
      if (check.reason === "invalid_type") errors.push({ field, reason: check.reason });
      continue;
    }
    pushLengthOrMissing(errors, field, check.value, {
      required: false,
      max: CONTACT_MAX_LENGTHS[field],
    });
  }

  if (typeof payload.email === "string" && payload.email.trim() && !EMAIL_REGEX.test(payload.email.trim())) {
    pushInvalidFormatIfMissing(errors, "email", "invalid_format");
  }

  return errors;
}

export function validateBooking(payload: BookingPayload): FieldError[] {
  const errors: FieldError[] = [];

  for (const field of BOOKING_REQUIRED) {
    const check = checkString(payload[field]);
    if (!check.ok) {
      errors.push({ field, reason: check.reason });
      continue;
    }
    pushLengthOrMissing(errors, field, check.value, {
      required: true,
      max: BOOKING_MAX_LENGTHS[field],
    });
  }

  for (const field of BOOKING_OPTIONAL) {
    const check = checkString(payload[field]);
    if (!check.ok) {
      if (check.reason === "invalid_type") errors.push({ field, reason: check.reason });
      continue;
    }
    pushLengthOrMissing(errors, field, check.value, {
      required: false,
      max: BOOKING_MAX_LENGTHS[field],
    });
  }

  if (typeof payload.email === "string" && payload.email.trim() && !EMAIL_REGEX.test(payload.email.trim())) {
    pushInvalidFormatIfMissing(errors, "email", "invalid_format");
  }

  if (typeof payload.telefono === "string" && payload.telefono.trim() && !isValidPhone(payload.telefono)) {
    pushInvalidFormatIfMissing(errors, "telefono", "invalid_format");
  }

  if (typeof payload.fecha === "string" && payload.fecha.trim() && !isValidDateString(payload.fecha)) {
    pushInvalidFormatIfMissing(errors, "fecha", "invalid_format");
  }

  return errors;
}
