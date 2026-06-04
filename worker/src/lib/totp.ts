/**
 * TOTP (Time-based One-Time Password) Helper
 * For 2FA Authenticator App support (Google Authenticator, Authy, etc.)
 * Uses Web Crypto API available in Cloudflare Workers
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random TOTP secret (Base32 encoded)
 */
export function generateTOTPSecret(): string {
  const bytes = new Uint8Array(20); // 160 bits
  crypto.getRandomValues(bytes);
  
  let secret = '';
  for (const byte of bytes) {
    secret += BASE32_CHARS[(byte >> 3) & 0x1f];
    secret += BASE32_CHARS[((byte & 0x07) << 2) | ((byte >> 6) & 0x03)];
  }
  return secret.substring(0, 32); // 32 chars = 160 bits
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    codes.push(code.toUpperCase());
  }
  return codes;
}

/**
 * Decode Base32 string to Uint8Array
 */
function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of cleaned) {
    const value = BASE32_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 5) | value;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Generate TOTP code for current time step
 */
export async function generateTOTPCode(
  secret: string,
  timeStep?: number
): Promise<string> {
  const step = timeStep || Math.floor(Date.now() / 30000);
  const stepBuffer = new ArrayBuffer(8);
  const stepView = new DataView(stepBuffer);
  stepView.setBigUint64(0, BigInt(step));

  const key = base32Decode(secret);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const hmac = await crypto.subtle.sign('HMAC', cryptoKey, stepBuffer);
  const hmacArray = new Uint8Array(hmac);

  const offset = hmacArray[hmacArray.length - 1] & 0x0f;
  const code =
    ((hmacArray[offset] & 0x7f) << 24) |
    ((hmacArray[offset + 1] & 0xff) << 16) |
    ((hmacArray[offset + 2] & 0xff) << 8) |
    (hmacArray[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify a TOTP code against a secret
 * Checks current step and ±1 step (for clock drift)
 */
export async function verifyTOTP(
  secret: string,
  code: string,
  windowSteps: number = 1
): Promise<boolean> {
  const currentStep = Math.floor(Date.now() / 30000);

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const expectedCode = await generateTOTPCode(secret, currentStep + i);
    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generate otpauth:// URL for QR code
 */
export function generateOTPAuthURL(
  secret: string,
  email: string,
  issuer: string = 'DAKKHO'
): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
