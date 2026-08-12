import { describe, expect, it } from "vitest";
import keymapJson from "../../public/keymap.json";
import { keysOverlap, containedImageRect, hitTest, type Keymap } from "./coords.ts";

const km = keymapJson as Keymap;

describe("keymap / coordinate transform", () => {
  it("has 50 physical keys", () => {
    expect(km.keys).toHaveLength(50);
  });

  it("all hit-zones lie within the source image 0-100%", () => {
    for (const k of km.keys) {
      expect(k.x).toBeGreaterThanOrEqual(0);
      expect(k.y).toBeGreaterThanOrEqual(0);
      expect(k.x + k.w).toBeLessThanOrEqual(100.01);
      expect(k.y + k.h).toBeLessThanOrEqual(100.01);
    }
  });

  it("debug overlay and hit-test share containedImageRect", () => {
    const rect = containedImageRect(400, 800, km.sourceImageWidth, km.sourceImageHeight);
    expect(rect.w / rect.h).toBeCloseTo(km.sourceImageWidth / km.sourceImageHeight, 5);
    const key = km.keys[0];
    expect(key).toBeTruthy();
    const cx = rect.x + ((key!.x + key!.w / 2) / 100) * rect.w;
    const cy = rect.y + ((key!.y + key!.h / 2) / 100) * rect.h;
    const hit = hitTest(rect, km.keys, cx, cy, 0, 0);
    expect(hit?.id).toBe(key!.id);
  });

  it("reports overlapping hit-zones for human review", () => {
    const overlaps = keysOverlap(km.keys);
    const allowed = new Set(["up|left", "up|right", "down|left", "down|right", "left|up", "right|up", "left|down", "right|down"]);
    const unexpected = overlaps.filter((pair: [string, string]) => !allowed.has(`${pair[0]}|${pair[1]}`));
    expect(unexpected).toEqual([]);
  });
});
