export function dividerShareFromPointer(pointer: number, start: number, size: number) {
  if (!Number.isFinite(pointer) || !Number.isFinite(start) || !Number.isFinite(size) || size <= 0) return 50;
  return Math.min(75, Math.max(25, Math.round(((pointer - start) / size) * 100)));
}

export type ImageFocus = { x: number; y: number; zoom: number };

export function clampImageFocus(focus: ImageFocus): ImageFocus {
  return {
    x: Math.min(100, Math.max(-100, Number.isFinite(focus.x) ? Math.round(focus.x) : 0)),
    y: Math.min(100, Math.max(-100, Number.isFinite(focus.y) ? Math.round(focus.y) : 0)),
    zoom: Math.min(3, Math.max(1, Number.isFinite(focus.zoom) ? Math.round(focus.zoom * 100) / 100 : 1)),
  };
}

export function moveImageFocus(focus: ImageFocus, deltaX: number, deltaY: number, width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return clampImageFocus(focus);
  return clampImageFocus({
    ...focus,
    x: focus.x + (deltaX / width) * 100,
    y: focus.y + (deltaY / height) * 100,
  });
}

export function imageCropGeometry(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, inputFocus: ImageFocus) {
  const focus = clampImageFocus(inputFocus);
  const scale = Math.max(targetWidth / Math.max(1, sourceWidth), targetHeight / Math.max(1, sourceHeight)) * focus.zoom;
  const width = Math.max(targetWidth, Math.round(sourceWidth * scale));
  const height = Math.max(targetHeight, Math.round(sourceHeight * scale));
  const horizontalRoom = width - targetWidth;
  const verticalRoom = height - targetHeight;
  return {
    width,
    height,
    left: Math.round(horizontalRoom * (.5 - focus.x / 200)),
    top: Math.round(verticalRoom * (.5 - focus.y / 200)),
  };
}
