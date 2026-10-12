/**
 * WhatsApp link and phone formatting utility for Cross-Hunt
 */

export function cleanPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function formatIndianPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = cleanPhoneNumber(phone);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    const raw = digits.slice(2);
    return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  }
  return phone.trim();
}

export function isValidWhatsAppMobile(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const digits = cleanPhoneNumber(phone);
  // Indian mobile: 10 digits starting with 6, 7, 8, 9
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) {
    return true;
  }
  // Indian mobile with 91 prefix
  if (digits.length === 12 && digits.startsWith('91') && ['6', '7', '8', '9'].includes(digits[2])) {
    return true;
  }
  // Indian mobile with leading 0
  if (digits.length === 11 && digits.startsWith('0') && ['6', '7', '8', '9'].includes(digits[1])) {
    return true;
  }
  // Landline area codes to reject
  if (
    digits.startsWith('03192') ||
    digits.startsWith('3192') ||
    digits.startsWith('022') ||
    digits.startsWith('011') ||
    digits.startsWith('080') ||
    digits.startsWith('044') ||
    digits.startsWith('033')
  ) {
    return false;
  }
  // General international mobile
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith('0') && !digits.startsWith('1')) {
    return true;
  }
  return false;
}

export function generateWhatsAppUrl(
  phoneOrWa: string | undefined | null,
  shipName: string,
  targetDate?: string,
  guestsCount?: number,
  customMessage?: string
): string | null {
  if (!phoneOrWa) return null;
  const digits = cleanPhoneNumber(phoneOrWa);
  if (!digits || digits.length < 10) return null;

  let formattedDigits = digits;
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) {
    formattedDigits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    formattedDigits = `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    formattedDigits = digits;
  }

  // Pre-filled message requirement:
  // "Hello, I am interested in booking [Ship Name] for [Date]."
  const dateStr = targetDate && targetDate.trim() ? targetDate.trim() : 'an upcoming voyage';
  let message = `Hello, I am interested in booking ${shipName} for ${dateStr}.`;

  if (guestsCount && guestsCount > 1) {
    message += ` Headcount: ${guestsCount} guests.`;
  }
  if (customMessage && customMessage.trim()) {
    message += ` Note: ${customMessage.trim()}`;
  }

  return `https://wa.me/${formattedDigits}?text=${encodeURIComponent(message)}`;
}
