const phoneCharacters = /^[+\d\s().-]*$/;

export function normalizeCanadianPhone(value: string) {
  const trimmed = value.normalize("NFKC").trim();
  if (!trimmed) return null;
  if (!phoneCharacters.test(trimmed)) throw new Error("Enter a valid Canadian phone number beginning with +1.");
  const digits = trimmed.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length !== 10 || !/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
    throw new Error("Enter a valid Canadian phone number beginning with +1.");
  }
  return `+1${national}`;
}

export function formatCanadianPhone(value: string | null | undefined) {
  if (!value) return "";
  try {
    const normalized = normalizeCanadianPhone(value);
    return normalized ? `${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8)}` : "";
  } catch {
    return value;
  }
}
