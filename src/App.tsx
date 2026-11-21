import { useEffect, useState } from "react";
import { OPTIONAL_KEYBOARD_MAP, isKeyId, type KeyId } from "./calc/keys.ts";
import { useCalcStore } from "./store.ts";
import { armIdleTimeout } from "./idleTimer.ts";
import { Chassis } from "./ui/Chassis.tsx";
import { haptic, playKeyClick, unlockAudio } from "./ui/feedback.ts";
import type { Keymap } from "./ui/coords.ts";

function scrollResultViewport(keyId: KeyId): boolean {
  if (keyId !== "left" && keyId !== "right") {
    return false;
  }
  const event = new CustomEvent<KeyId>("calculator-result-scroll", { detail: keyId, cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

function shouldRestoreInputOnAc(): boolean {
  const event = new CustomEvent("calculator-ac-context", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

export function App() {
  const state = useCalcStore((s) => s.state);
  const dispatch = useCalcStore((s) => s.dispatch);
  const hydrate = useCalcStore((s) => s.hydrate);
  const tick = useCalcStore((s) => s.tick);
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const debug = new URLSearchParams(window.location.search).get("debug") === "true";

  useEffect(() => {
    hydrate();
    void fetch("keymap.json")
      .then((r) => r.json())
      .then((data: Keymap) => setKeymap(data));
  }, [hydrate]);

  useEffect(() => {
    const cancelTimer = armIdleTimeout(
      () => useCalcStore.getState().state,
      (nowMs) => useCalcStore.getState().tick(nowMs),
    );
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [state.lastActivityMs, state.power, tick]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) {
        return;
      }
      const mapped = OPTIONAL_KEYBOARD_MAP[ev.key] ?? (isKeyId(ev.key) ? ev.key : undefined);
      if (!mapped) {
        return;
      }
      const active =
        document.activeElement instanceof HTMLElement ? document.activeElement.closest("[data-key]") : null;
      if (active && (ev.key === "Enter" || ev.key === " ")) {
        return;
      }
      ev.preventDefault();
      if (scrollResultViewport(mapped)) {
        return;
      }
      dispatch({
        keyId: mapped,
        source: "keyboard",
        restoreInputOnAc: mapped === "ac" && shouldRestoreInputOnAc(),
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  const onKey = (id: KeyId) => {
    unlockAudio();
    playKeyClick();
    haptic();
    if (scrollResultViewport(id)) {
      return;
    }
    dispatch({
      keyId: id,
      source: "pointer",
      restoreInputOnAc: id === "ac" && shouldRestoreInputOnAc(),
    });
  };

  if (!keymap) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading calculator…</div>;
  }

  return (
    <main className="min-h-dvh bg-[#12151a] px-2 py-3">
      <h1 className="sr-only">Casio fx-991ES PLUS 2nd edition</h1>
      <Chassis
        keymap={keymap}
        imageSrc="assets/chassis-fx-991es-plus-2.png"
        state={state}
        debug={debug}
        onKey={onKey}
      />
    </main>
  );
}
