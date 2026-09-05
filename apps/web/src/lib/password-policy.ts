export const passwordRequirements = [
  { key: "length", label: "At least 10 characters", test: (value: string) => value.length >= 10 },
  { key: "lowercase", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { key: "uppercase", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "number", label: "One number", test: (value: string) => /\d/.test(value) },
  { key: "symbol", label: "One symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function passwordPolicyErrors(value: string) {
  return passwordRequirements.filter((requirement) => !requirement.test(value)).map((requirement) => requirement.label);
}

export function passwordIsValid(value: string) {
  return value.length <= 128 && passwordPolicyErrors(value).length === 0;
}
