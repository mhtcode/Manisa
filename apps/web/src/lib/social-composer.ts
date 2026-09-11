export function dividerShareFromPointer(pointer: number, start: number, size: number) {
  if (!Number.isFinite(pointer) || !Number.isFinite(start) || !Number.isFinite(size) || size <= 0) return 50;
  return Math.min(75, Math.max(25, Math.round(((pointer - start) / size) * 100)));
}
