import DOMPurify from 'dompurify';

const LIMITS = {
  message: 2000,
  symbol: 10,
  name: 100,
  email: 254,
  url: 500,
  amount: 999_999_999_999,
};

export function sanitizeText(input: unknown, maxLen = 500): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim().slice(0, maxLen), { ALLOWED_TAGS: [] });
}

export function validateStockSymbol(symbol: unknown): string {
  const s = sanitizeText(symbol, LIMITS.symbol).toUpperCase();
  if (!/^[A-Z]{2,10}$/.test(s)) throw new Error('Invalid stock symbol');
  return s;
}

export function validateAmount(amount: unknown): number {
  const n = Number(amount);
  if (!isFinite(n) || n < 0 || n > LIMITS.amount) throw new Error('Invalid amount');
  return n;
}

export function validateEmail(email: unknown): string {
  const e = sanitizeText(email, LIMITS.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Invalid email');
  return e;
}

export function validateChatMessage(msg: unknown): string {
  const s = sanitizeText(msg, LIMITS.message);
  if (s.length < 1) throw new Error('Empty message');
  return s;
}

export function validateUrl(url: unknown): string {
  const u = sanitizeText(url, LIMITS.url);
  try {
    const parsed = new URL(u);
    if (!['https:'].includes(parsed.protocol)) throw new Error();
    return parsed.href;
  } catch {
    throw new Error('Invalid or non-HTTPS URL');
  }
}

export function validateName(name: unknown): string {
  const s = sanitizeText(name, LIMITS.name);
  if (s.length < 1) throw new Error('Name cannot be empty');
  return s;
}

const ALLOWED_PROMPT_CHARS = /^[\p{L}\p{N}\s.,!?()%@#\-_'"]+$/u;

export function validatePromptParam(raw: string | null): string | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw).slice(0, 500);
  const sanitized = DOMPurify.sanitize(decoded, { ALLOWED_TAGS: [] });
  if (!ALLOWED_PROMPT_CHARS.test(sanitized)) return null;
  return sanitized;
}
