export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface KeymapKey extends Rect {
  id: string;
  primary: string;
  shift: string | null;
  alpha: string | null;
}

export interface Keymap {
  version: number;
  sourceImage: string;
  sourceImageWidth: number;
  sourceImageHeight: number;
  sourceImageAspect: number;
  lcd: Rect;
  keys: KeymapKey[];
}

/** Map source-image space through object-fit:contain into the container. */
export function containedImageRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): Rect {
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  return {
    x: (containerW - w) / 2,
    y: (containerH - h) / 2,
    w,
    h,
  };
}

export function percentToLocal(rect: Rect, box: Rect): Rect {
  return {
    x: rect.x + (box.x / 100) * rect.w,
    y: rect.y + (box.y / 100) * rect.h,
    w: (box.w / 100) * rect.w,
    h: (box.h / 100) * rect.h,
  };
}

export function hitTest(
  imageRect: Rect,
  keys: KeymapKey[],
  clientX: number,
  clientY: number,
  originX: number,
  originY: number,
): KeymapKey | null {
  const x = clientX - originX;
  const y = clientY - originY;
  if (x < imageRect.x || y < imageRect.y || x > imageRect.x + imageRect.w || y > imageRect.y + imageRect.h) {
    return null;
  }
  for (const key of keys) {
    const r = percentToLocal(imageRect, key);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      return key;
    }
  }
  return null;
}

export function keysOverlap(keys: KeymapKey[]): Array<[string, string]> {
  const hits: Array<[string, string]> = [];
  for (let i = 0; i < keys.length; i += 1) {
    const a = keys[i];
    if (!a) {
      continue;
    }
    for (let j = i + 1; j < keys.length; j += 1) {
      const b = keys[j];
      if (!b) {
        continue;
      }
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.05 && oy > 0.05) {
        hits.push([a.id, b.id]);
      }
    }
  }
  return hits;
}
