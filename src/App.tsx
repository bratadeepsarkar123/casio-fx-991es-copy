import { useEffect, useState } from "react";
import { OPTIONAL_KEYBOARD_MAP, isKeyId, type KeyId } from "./calc/keys.ts";
import { useCalcStore } from "./store.ts";
import { Chassis } from "./ui/Chassis.tsx";
import { haptic, playKeyClick, unlockAudio } from "./ui/feedback.ts";
import type { Keymap } from "./ui/coords.ts";

export function App() {
  const state = useCalcStore((s) => s.state);
  const dispatch = useCalcStore((s) => s.dispatch);
  const hydrate = useCalcStore((s) => s.hydrate);
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const debug = new URLSearchParams(window.location.search).get("debug") !== "false";

  useEffect(() => {
    hydrate();
    void fetch("keymap.json")
      .then((r) => r.json())
      .then((data: Keymap) => setKeymap(data));
  }, [hydrate]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) {
        return;
      }
      const mapped = OPTIONAL_KEYBOARD_MAP[ev.key] ?? (isKeyId(ev.key) ? ev.key : undefined);
      if (!mapped) {
        return;
      }
      ev.preventDefault();
      dispatch({ keyId: mapped, source: "keyboard" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  const onKey = (id: KeyId) => {
    unlockAudio();
    playKeyClick();
    haptic();
    dispatch({ keyId: id, source: "pointer" });
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
