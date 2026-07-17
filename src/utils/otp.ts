/**
 * Utility to extract OTP codes from text content.
 * Specifically handles the format from unich.com and common 6-digit codes.
 */
export function extractOTP(text: string, from?: string, subject?: string): string | null {
  if (!text) return null;

  // 1. Try specifically for unich.com format if specified
  const isUnich = (from && from.toLowerCase().includes('unich.com')) || 
                  (subject && subject.toLowerCase().includes('unich'));

  if (isUnich) {
    // Look for 6-digit code after phrases like "OTP" or "One Time Password"
    const otpMatch = text.match(/(?:OTP|One Time Password|mã xác nhận|mã OTP)(?::|\s+)?(\d{6})/i);
    if (otpMatch) return otpMatch[1];
    
    // Specifically handle the pattern: "following One Time Password (OTP):\n\n792180"
    const patternMatch = text.match(/Password\s*\(OTP\):\s*(\d{6})/i);
    if (patternMatch) return patternMatch[1];

    // Look for a standalone 6-digit code in a paragraph that seems to be the OTP
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      if (/^\d{6}$/.test(line)) return line;
    }
  }

  // 2. General 6-digit numeric code detection
  // We look for 6 consecutive digits that are surrounded by non-digit characters or boundaries
  const generalMatches = text.match(/(?:\D|^)(\d{6})(?:\D|$)/g);
  if (generalMatches && generalMatches.length > 0) {
    // If we have multiple, the first one is usually the most relevant
    const firstMatch = generalMatches[0].match(/\d{6}/);
    return firstMatch ? firstMatch[0] : null;
  }

  // 3. Fallback to check subject for OTP
  if (subject) {
    const subjectMatch = subject.match(/\d{6}/);
    if (subjectMatch) return subjectMatch[0];
  }

  return null;
}
