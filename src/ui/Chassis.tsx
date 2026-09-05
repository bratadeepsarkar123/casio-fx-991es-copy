import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyId } from "../calc/keys.ts";
import { isKeyId } from "../calc/keys.ts";
import { containedImageRect, percentToLocal, type Keymap } from "./coords.ts";
import { Lcd } from "./Lcd.tsx";
import type { CalcState } from "../calc/types.ts";

interface ChassisProps {
  keymap: Keymap;
  imageSrc: string;
  state: CalcState;
  debug: boolean;
  onKey: (id: KeyId) => void;
}

export function Chassis({ keymap, imageSrc, state, debug, onKey }: ChassisProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => {
      setBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const imageRect = useMemo(
    () => containedImageRect(box.w, box.h, keymap.sourceImageWidth, keymap.sourceImageHeight),
    [box.h, box.w, keymap.sourceImageHeight, keymap.sourceImageWidth],
  );

  const lcd = percentToLocal(imageRect, keymap.lcd);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto h-[min(96dvh,920px)] w-full max-w-[520px]"
      data-testid="chassis-wrap"
    >
      <img
        src={imageSrc}
        alt="Casio fx-991ES PLUS 2nd edition"
        className="pointer-events-none absolute select-none"
        draggable={false}
        style={{
          left: imageRect.x,
          top: imageRect.y,
          width: imageRect.w,
          height: imageRect.h,
        }}
      />
      {box.w > 0 ? (
        <Lcd
          state={state}
          style={{
            position: "absolute",
            left: lcd.x,
            top: lcd.y,
            width: lcd.w,
            height: lcd.h,
            fontSize: Math.max(10, lcd.h * 0.14),
          }}
        />
      ) : null}
      {keymap.keys.map((key) => {
        const r = percentToLocal(imageRect, key);
        const label = [
          key.primary,
          key.shift ? `SHIFT ${key.shift}` : null,
          key.alpha ? `ALPHA ${key.alpha}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <button
            key={key.id}
            type="button"
            data-key={key.id}
            aria-label={label}
            className="absolute cursor-pointer bg-transparent"
            style={{
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              borderRadius: "18%",
            }}
            onPointerDown={(ev) => {
              ev.preventDefault();
              if (isKeyId(key.id)) {
                onKey(key.id);
              }
            }}
            onKeyDown={(ev) => {
              if (ev.key !== "Enter" && ev.key !== " ") {
                return;
              }
              ev.preventDefault();
              ev.stopPropagation();
              if (isKeyId(key.id)) {
                onKey(key.id);
              }
            }}
            onClick={(ev) => {
              if (ev.detail !== 0) {
                return;
              }
              ev.preventDefault();
              if (isKeyId(key.id)) {
                onKey(key.id);
              }
            }}
          />
        );
      })}
      {debug
        ? keymap.keys.map((key) => {
            const r = percentToLocal(imageRect, key);
            const dpad = key.id === "up" || key.id === "down" || key.id === "left" || key.id === "right";
            return (
              <div
                key={`dbg-${key.id}`}
                className="pointer-events-none absolute text-[9px] leading-none text-yellow-200"
                style={{
                  left: r.x,
                  top: r.y,
                  width: r.w,
                  height: r.h,
                  border: dpad ? "3px solid #ef4444" : "2px solid #ef4444",
                  boxSizing: "border-box",
                  zIndex: 4,
                }}
                data-debug-key={key.id}
                data-testid={dpad ? `overlay-${key.id}` : undefined}
              >
                <span className="bg-black/80 px-0.5">{key.id}</span>
              </div>
            );
          })
        : null}
    </div>
  );
}
