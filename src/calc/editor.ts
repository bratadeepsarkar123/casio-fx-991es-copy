import type { Atom, ComplexFormat, Cursor, DisplayFormat, EditorState, HistoryEntry, VarName } from "./types.ts";
import { scientificCallLabel, scientificConstantByCallName, unitConversionByCallName } from "./scientificData.ts";

export const MAX_BYTES = 99;

export function emptyEditor(): EditorState {
  return {
    root: [],
    cursor: { path: [], index: 0, offset: null },
    insertMode: "insert",
  };
}

export type SlotField = "num" | "den" | "inner" | "exp" | "base" | "arg" | "n" | "whole" | "args0" | "args1" | "args2" | "args3";

interface PathStep {
  index: number;
  field: SlotField;
}

function parsePath(path: number[]): PathStep[] {
  const steps: PathStep[] = [];
  for (let i = 0; i + 1 < path.length; i += 2) {
    const index = path[i];
    const fieldCode = path[i + 1];
    if (index === undefined || fieldCode === undefined) {
      continue;
    }
    steps.push({ index, field: fieldFromCode(fieldCode) });
  }
  return steps;
}

export function fieldToCode(field: SlotField): number {
  switch (field) {
    case "num":
      return 0;
    case "den":
      return 1;
    case "inner":
      return 2;
    case "exp":
      return 3;
    case "base":
      return 4;
    case "arg":
      return 5;
    case "n":
      return 6;
    case "whole":
      return 7;
    case "args0":
      return 8;
    case "args1":
      return 9;
    case "args2":
      return 10;
    case "args3":
      return 11;
    default: {
      const _never: never = field;
      return _never;
    }
  }
}

function fieldFromCode(code: number): SlotField {
  switch (code) {
    case 0:
      return "num";
    case 1:
      return "den";
    case 2:
      return "inner";
    case 3:
      return "exp";
    case 4:
      return "base";
    case 5:
      return "arg";
    case 6:
      return "n";
    case 7:
      return "whole";
    case 8:
      return "args0";
    case 9:
      return "args1";
    case 10:
      return "args2";
    case 11:
      return "args3";
    default:
      return "inner";
  }
}

function getField(atom: Atom, field: SlotField): Atom[] | null {
  switch (atom.t) {
    case "frac":
      return field === "num" ? atom.num : field === "den" ? atom.den : null;
    case "mixed":
      return field === "whole" ? atom.whole : field === "num" ? atom.num : field === "den" ? atom.den : null;
    case "sexagesimal":
      return field === "whole" ? atom.deg : field === "num" ? atom.min : field === "den" ? atom.sec : null;
    case "sqrt":
    case "cbrt":
    case "neg":
    case "abs":
    case "post":
    case "angle":
    case "group":
      return field === "inner" ? atom.inner : null;
    case "nthrt":
      return field === "n" ? atom.n : field === "inner" ? atom.inner : null;
    case "pow":
      return field === "base" ? atom.base : field === "exp" ? atom.exp : null;
    case "logb":
      return field === "base" ? atom.base : field === "arg" ? atom.arg : null;
    case "call":
      return field.startsWith("args") ? atom.args[Number(field.slice(4))] ?? null : null;
    default:
      return null;
  }
}

function setField(atom: Atom, field: SlotField, slot: Atom[]): Atom {
  switch (atom.t) {
    case "frac":
      return field === "num" ? { ...atom, num: slot } : field === "den" ? { ...atom, den: slot } : atom;
    case "mixed":
      if (field === "whole") {
        return { ...atom, whole: slot };
      }
      if (field === "num") {
        return { ...atom, num: slot };
      }
      if (field === "den") {
        return { ...atom, den: slot };
      }
      return atom;
    case "sexagesimal":
      if (field === "whole") {
        return { ...atom, deg: slot };
      }
      if (field === "num") {
        return { ...atom, min: slot };
      }
      if (field === "den") {
        return { ...atom, sec: slot };
      }
      return atom;
    case "sqrt":
    case "cbrt":
    case "neg":
    case "abs":
      return field === "inner" ? { ...atom, inner: slot } : atom;
    case "post":
    case "angle":
    case "group":
      return field === "inner" ? { ...atom, inner: slot } : atom;
    case "nthrt":
      return field === "n" ? { ...atom, n: slot } : field === "inner" ? { ...atom, inner: slot } : atom;
    case "pow":
      return field === "base" ? { ...atom, base: slot } : field === "exp" ? { ...atom, exp: slot } : atom;
    case "logb":
      return field === "base" ? { ...atom, base: slot } : field === "arg" ? { ...atom, arg: slot } : atom;
    case "call":
      if (field.startsWith("args")) {
        const args = [...atom.args];
        const idx = Number(field.slice(4));
        args[idx] = slot;
        return { ...atom, args };
      }
      return atom;
    default:
      return atom;
  }
}

interface Located {
  slot: Atom[];
  parent: Atom[] | null;
  parentIndex: number;
  field: SlotField | null;
}

function locate(root: Atom[], path: number[]): Located {
  const steps = parsePath(path);
  let slot = root;
  let parent: Atom[] | null = null;
  let parentIndex = -1;
  let field: SlotField | null = null;
  for (const step of steps) {
    const atom = slot[step.index];
    if (!atom) {
      break;
    }
    const next = getField(atom, step.field);
    if (!next) {
      break;
    }
    parent = slot;
    parentIndex = step.index;
    field = step.field;
    slot = next;
  }
  return { slot, parent, parentIndex, field };
}

function replaceSlot(root: Atom[], path: number[], nextSlot: Atom[]): Atom[] {
  const steps = parsePath(path);
  if (steps.length === 0) {
    return nextSlot;
  }
  const rec = (atoms: Atom[], i: number): Atom[] => {
    const step = steps[i];
    if (!step) {
      return atoms;
    }
    const atom = atoms[step.index];
    if (!atom) {
      return atoms;
    }
    if (i === steps.length - 1) {
      const copy = [...atoms];
      copy[step.index] = setField(atom, step.field, nextSlot);
      return copy;
    }
    const child = getField(atom, step.field);
    if (!child) {
      return atoms;
    }
    const copy = [...atoms];
    copy[step.index] = setField(atom, step.field, rec(child, i + 1));
    return copy;
  };
  return rec(root, 0);
}

function cloneEditor(ed: EditorState): EditorState {
  return {
    root: ed.root,
    cursor: { ...ed.cursor, path: [...ed.cursor.path] },
    insertMode: ed.insertMode,
    argumentCapture: ed.argumentCapture,
  };
}

function isValueAtom(atom: Atom | undefined): boolean {
  if (!atom) {
    return false;
  }
  switch (atom.t) {
    case "op":
    case "colon":
    case "comma":
    case "placeholder":
      return false;
    default:
      return true;
  }
}

export function insertAtom(ed: EditorState, atom: Atom): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const previous = slot[ed.cursor.index - 1];
  if (previous?.t === "num" && ed.cursor.offset !== null && ed.cursor.offset < previous.s.length) {
    const before = previous.s.slice(0, ed.cursor.offset);
    const after = previous.s.slice(ed.cursor.offset + 1);
    const next = [...slot];
    if (ed.insertMode === "overwrite") {
      next.splice(ed.cursor.index - 1, 1, ...(before ? [{ t: "num" as const, s: before }] : []), atom, ...(after ? [{ t: "num" as const, s: after }] : []));
    } else {
      next.splice(ed.cursor.index - 1, 1, ...(before ? [{ t: "num" as const, s: before }] : []), atom, { t: "num", s: previous.s.slice(ed.cursor.offset) });
    }
    const index = ed.cursor.index - 1 + (before ? 1 : 0) + 1;
    return { ...ed, argumentCapture: undefined, root: replaceSlot(ed.root, ed.cursor.path, next), cursor: { path: ed.cursor.path, index, offset: null } };
  }
  if (ed.insertMode === "overwrite" && ed.cursor.index < slot.length) {
    const current = slot[ed.cursor.index];
    const next = [...slot];
    if (current?.t === "num" && ed.cursor.offset !== null && ed.cursor.offset < current.s.length) {
      const before = current.s.slice(0, ed.cursor.offset);
      const after = current.s.slice(ed.cursor.offset + 1);
      next.splice(ed.cursor.index, 1, ...(before ? [{ t: "num" as const, s: before }] : []), atom, ...(after ? [{ t: "num" as const, s: after }] : []));
      const index = ed.cursor.index + (before ? 1 : 0) + 1;
      return { ...ed, argumentCapture: undefined, root: replaceSlot(ed.root, ed.cursor.path, next), cursor: { path: ed.cursor.path, index, offset: null } };
    }
    next[ed.cursor.index] = atom;
    return {
      ...ed,
      argumentCapture: undefined,
      root: replaceSlot(ed.root, ed.cursor.path, next),
      cursor: { path: ed.cursor.path, index: ed.cursor.index + 1, offset: null },
    };
  }
  const next = [...slot];
  next.splice(ed.cursor.index, 0, atom);
  const root = replaceSlot(ed.root, ed.cursor.path, next);
  return {
    ...ed,
    argumentCapture: undefined,
    root,
    cursor: { path: ed.cursor.path, index: ed.cursor.index + 1, offset: null },
  };
}

export function insertDigit(ed: EditorState, d: string): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  if (ed.insertMode === "overwrite") {
    const previous = slot[ed.cursor.index - 1];
    if (previous?.t === "num" && ed.cursor.offset !== null && ed.cursor.offset < previous.s.length) {
      const s = previous.s.slice(0, ed.cursor.offset) + d + previous.s.slice(ed.cursor.offset + 1);
      const next = [...slot];
      next[ed.cursor.index - 1] = { t: "num", s };
      return {
        ...ed,
        argumentCapture: undefined,
        root: replaceSlot(ed.root, ed.cursor.path, next),
        cursor: { ...ed.cursor, offset: ed.cursor.offset + 1 },
      };
    }
    const current = slot[ed.cursor.index];
    if (current?.t === "num" && ed.cursor.offset !== null && ed.cursor.offset < current.s.length) {
      const s = current.s.slice(0, ed.cursor.offset) + d + current.s.slice(ed.cursor.offset + 1);
      const next = [...slot];
      next[ed.cursor.index] = { t: "num", s };
      return {
        ...ed,
        argumentCapture: undefined,
        root: replaceSlot(ed.root, ed.cursor.path, next),
        cursor: { ...ed.cursor, offset: ed.cursor.offset + 1 },
      };
    }
    if (ed.cursor.index < slot.length) {
      const next = [...slot];
      next[ed.cursor.index] = { t: "num", s: d };
      return {
        ...ed,
        argumentCapture: undefined,
        root: replaceSlot(ed.root, ed.cursor.path, next),
        cursor: { path: ed.cursor.path, index: ed.cursor.index + 1, offset: null },
      };
    }
  }
  const prev = slot[ed.cursor.index - 1];
  if (prev?.t === "num") {
    const offset = ed.cursor.offset ?? prev.s.length;
    const s = prev.s.slice(0, offset) + d + prev.s.slice(offset);
    const next = [...slot];
    next[ed.cursor.index - 1] = { t: "num", s };
    return {
      ...ed,
      argumentCapture: undefined,
      root: replaceSlot(ed.root, ed.cursor.path, next),
      cursor: { ...ed.cursor, offset: offset + 1 },
    };
  }
  const inserted = insertAtom(ed, { t: "num", s: d });
  return { ...inserted, cursor: { ...inserted.cursor, offset: d.length } };
}

export function insertDot(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const prev = slot[ed.cursor.index - 1];
  if (prev?.t === "num") {
    if (prev.s.includes(".")) {
      return ed;
    }
    return insertDigit(ed, ".");
  }
  return insertAtom(ed, { t: "num", s: "0." });
}

export function insertOp(ed: EditorState, op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" | "∠"): EditorState {
  return insertAtom(ed, { t: "op", op });
}

export function insertCplxFmt(ed: EditorState, fmt: ComplexFormat): EditorState {
  return insertAtom(ed, { t: "cplxfmt", fmt });
}

function wrapPrevAs(ed: EditorState, make: (inner: Atom[]) => Atom, enter: SlotField): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const prev = slot[ed.cursor.index - 1];
  if (isValueAtom(prev) && prev) {
    const next = [...slot];
    next[ed.cursor.index - 1] = make([prev]);
    const root = replaceSlot(ed.root, ed.cursor.path, next);
    const path = [...ed.cursor.path, ed.cursor.index - 1, fieldToCode(enter)];
    const inner = getField(next[ed.cursor.index - 1]!, enter) ?? [];
    return {
      ...ed,
      argumentCapture: undefined,
      root,
      cursor: { path, index: inner.length, offset: null },
    };
  }
  const atom = make([]);
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode(enter)];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

export function insertFraction(ed: EditorState, mixed: boolean): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const wrapped = isValueAtom(slot[ed.cursor.index - 1]);
  if (mixed) {
    return wrapPrevAs(
      ed,
      (inner) => ({ t: "mixed", whole: inner, num: [], den: [] }),
      wrapped ? "num" : "whole",
    );
  }
  return wrapPrevAs(ed, (inner) => ({ t: "frac", num: inner, den: [] }), wrapped ? "den" : "num");
}

/**
 * Linear input uses a second fraction separator to turn an already-entered
 * denominator into the numerator of a mixed number (for example `3 frac 1
 * frac 2` becomes `3┘1┘2`). Natural input keeps the ordinary fraction
 * template semantics, so this transition is only selected by the LineIO
 * reducer.
 */
export function insertLinearFraction(ed: EditorState): EditorState {
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  const { slot: cursorSlot } = locate(ed.root, ed.cursor.path);
  const previous = cursorSlot[ed.cursor.index - 1];
  const cursorAtAtomEnd = ed.cursor.offset === null || (
    ed.cursor.index > 0 &&
    previous?.t === "num" &&
    ed.cursor.offset === previous.s.length
  );
  if (last && last.field === "den" && cursorAtAtomEnd) {
    const parentPath = ed.cursor.path.slice(0, -2);
    const { slot } = locate(ed.root, parentPath);
    const atom = slot[last.index];
    const denominator = atom?.t === "frac" ? atom.den : undefined;
    if (atom?.t === "frac" && denominator && ed.cursor.index === denominator.length && denominator.length > 0) {
      const mixed: Atom = { t: "mixed", whole: atom.num, num: denominator, den: [] };
      const next = [...slot];
      next[last.index] = mixed;
      const root = replaceSlot(ed.root, parentPath, next);
      const path = [...parentPath, last.index, fieldToCode("den")];
      return {
        ...ed,
        argumentCapture: undefined,
        root,
        cursor: { path, index: 0, offset: null },
      };
    }
  }
  return wrapCapturedArgument(ed, (num) => ({ t: "frac", num, den: [] }), "den") ?? insertFraction(ed, false);
}

export function insertSqrt(ed: EditorState): EditorState {
  // √ is a prefix function. The shared insertion path keeps an immediately
  // preceding value as an implicit-multiplication sibling (2√3), including
  // inside a unary-negative group (-2√2). Captured RHS expressions are
  // handled by the caller before this function and still wrap as a unit.
  const inserted = insertAtom(ed, { t: "sqrt", inner: [] });
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("inner")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

export function insertCbrt(ed: EditorState): EditorState {
  return wrapPrevAs(ed, (inner) => ({ t: "cbrt", inner }), "inner");
}

export function insertPower(ed: EditorState): EditorState {
  return wrapPrevAs(ed, (inner) => ({ t: "pow", base: inner.length ? inner : [{ t: "placeholder" }], exp: [] }), "exp");
}

export function insertNthRoot(ed: EditorState): EditorState {
  const atom: Atom = { t: "nthrt", n: [], inner: [] };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("n")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

/** LineIO prints the index before SHIFT+ⁿ√, so that preceding value is the n slot. */
export function insertNthRootWithIndex(ed: EditorState): EditorState {
  const wrapped = wrapPrevAs(ed, (n) => ({ t: "nthrt", n, inner: [] }), "n");
  return moveRight(wrapped);
}

export function insertLogab(ed: EditorState): EditorState {
  const atom: Atom = { t: "logb", base: [], arg: [] };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("base")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

/** Physical ×10^x scientific-notation entry. Not SHIFT+log `exp10(...)`. */
export const SCI10_CALL_NAME = "sci10";

function callLinearName(name: string): string {
  if (name === SCI10_CALL_NAME) {
    return "×10^";
  }
  if (name === "int") {
    return "∫";
  }
  if (name === "diff") {
    return "d/dx";
  }
  return name;
}

export function insertCall(ed: EditorState, name: string): EditorState {
  const atom: Atom = { t: "call", name, args: [[]], closed: false };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("args0")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

/** Insert a named call with its fixed Natural Display slots already present. */
export function insertCallTemplate(ed: EditorState, name: string, argCount: number): EditorState {
  const atom: Atom = { t: "call", name, args: Array.from({ length: argCount }, () => []), closed: false };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("args0")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

/** Zero-argument STAT commands (n, x̄, A, …). */
export function insertClosedCall(ed: EditorState, name: string): EditorState {
  return insertAtom(ed, { t: "call", name, args: [], closed: true });
}

export function insertUnitConversion(ed: EditorState, name: string): EditorState {
  const makeConversion = (value: Atom): Atom => ({ t: "call", name, args: [[value]], closed: true });
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];

  if (last?.field === "inner") {
    const parentPath = ed.cursor.path.slice(0, -2);
    const { slot: parentSlot } = locate(ed.root, parentPath);
    const parent = parentSlot[last.index];
    const { slot: inner } = locate(ed.root, ed.cursor.path);
    const lastInner = inner[ed.cursor.index - 1];
    const atEnd = ed.cursor.index === inner.length &&
      (ed.cursor.offset === null || (lastInner?.t === "num" && ed.cursor.offset >= lastInner.s.length));
    if (parent?.t === "neg" && atEnd) {
      const next = [...parentSlot];
      next[last.index] = makeConversion(parent);
      return {
        ...ed,
        argumentCapture: undefined,
        root: replaceSlot(ed.root, parentPath, next),
        cursor: { path: parentPath, index: last.index + 1, offset: null },
      };
    }
  }

  const { slot } = locate(ed.root, ed.cursor.path);
  const previousIndex = ed.cursor.index - 1;
  const previous = slot[previousIndex];
  if (!isValueAtom(previous) || !previous) {
    return ed;
  }

  const next = [...slot];
  if (previous.t === "num" && ed.cursor.offset !== null && ed.cursor.offset < previous.s.length) {
    const before = previous.s.slice(0, ed.cursor.offset);
    const after = previous.s.slice(ed.cursor.offset);
    if (!before) {
      return ed;
    }
    next.splice(
      previousIndex,
      1,
      makeConversion({ t: "num", s: before }),
      ...(after ? [{ t: "num" as const, s: after }] : []),
    );
  } else {
    next[previousIndex] = makeConversion(previous);
  }
  return {
    ...ed,
    argumentCapture: undefined,
    root: replaceSlot(ed.root, ed.cursor.path, next),
    cursor: { path: ed.cursor.path, index: previousIndex + 1, offset: null },
  };
}

/** x̂ / ŷ / t wrap the entire current expression as the argument (official “argument immediately before”). */
export function wrapRootAsClosedCall(ed: EditorState, name: string): EditorState {
  const args = ed.root.length > 0 ? [ed.root] : [[]];
  return {
    ...ed,
    argumentCapture: undefined,
    root: [{ t: "call", name, args, closed: true }],
    cursor: { path: [], index: 1, offset: null },
  };
}

export function insertAbs(ed: EditorState): EditorState {
  return wrapPrevAs(ed, (inner) => ({ t: "abs", inner }), "inner");
}

/** E-16 DRG postfix: wrap the value immediately before the cursor. */
export function insertAngle(ed: EditorState, unit: "°" | "r" | "g"): EditorState {
  return wrapPrevAs(ed, (inner) => ({ t: "angle", unit, inner }), "inner");
}

export function insertNeg(ed: EditorState): EditorState {
  const atom: Atom = { t: "neg", inner: [] };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("inner")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

export function insertPost(ed: EditorState, op: "sq" | "cube" | "inv" | "fact" | "pct" | "dms"): EditorState {
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (last?.field === "inner" && ed.cursor.offset === null) {
    const { slot: parent } = locate(ed.root, ed.cursor.path.slice(0, -2));
    if (parent[last.index]?.t === "post") {
      return ed;
    }
  }
  return wrapPrevAs(ed, (inner) => ({ t: "post", op, inner: inner.length ? inner : [{ t: "placeholder" }] }), "inner");
}

export function insertGroup(ed: EditorState): EditorState {
  const atom: Atom = { t: "group", inner: [], closed: false };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("inner")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

export function closeGroupOrCall(ed: EditorState): EditorState {
  if (ed.cursor.path.length < 2) {
    return insertAtom(ed, { t: "group", inner: [], closed: true });
  }
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (!last) {
    return ed;
  }
  const parentPath = ed.cursor.path.slice(0, -2);
  const { slot } = locate(ed.root, parentPath);
  const atom = slot[last.index];
  if (!atom) {
    return ed;
  }
  let nextAtom = atom;
  if (atom.t === "group") {
    nextAtom = { ...atom, closed: true };
  } else if (atom.t === "call") {
    nextAtom = { ...atom, closed: true };
  } else if (atom.t === "frac") {
    const path = [...parentPath, last.index, fieldToCode("den")];
    return { ...ed, cursor: { path, index: atom.den.length, offset: null } };
  } else if (atom.t === "pow") {
    return { ...ed, cursor: { path: parentPath, index: last.index + 1, offset: null } };
  } else if (atom.t === "logb") {
    if (last.field === "base") {
      const path = [...parentPath, last.index, fieldToCode("arg")];
      return { ...ed, cursor: { path, index: atom.arg.length, offset: null } };
    }
    return { ...ed, cursor: { path: parentPath, index: last.index + 1, offset: null } };
  }
  const nextSlot = [...slot];
  nextSlot[last.index] = nextAtom;
  const root = replaceSlot(ed.root, parentPath, nextSlot);
  return {
    ...ed,
      argumentCapture: undefined,
    root,
    cursor: { path: parentPath, index: last.index + 1, offset: null },
  };
}

export function insertVar(ed: EditorState, name: VarName): EditorState {
  return insertAtom(ed, { t: "var", name });
}

export function insertSym(ed: EditorState, name: "pi" | "e" | "ans" | "preAns" | "i"): EditorState {
  return insertAtom(ed, { t: "sym", name });
}

export function insertColon(ed: EditorState): EditorState {
  return insertAtom(ed, { t: "colon" });
}

export function insertComma(ed: EditorState): EditorState {
  const found = enclosingCall(ed);
  if (found) {
    if (found.atom.args.length >= 4) {
      return insertAtom(ed, { t: "comma" });
    }
    const args = [...found.atom.args];
    args.push([]);
    const nextSlot = [...found.slot];
    nextSlot[found.index] = { ...found.atom, args };
    const root = replaceSlot(ed.root, found.parentPath, nextSlot);
    const argIndex = args.length - 1;
    const field = `args${argIndex}` as SlotField;
    const path = [...found.parentPath, found.index, fieldToCode(field)];
    return { ...ed, root, cursor: { path, index: 0, offset: null } };
  }
  return insertAtom(ed, { t: "comma" });
}

function enclosingCall(ed: EditorState): { parentPath: number[]; index: number; atom: Extract<Atom, { t: "call" }>; slot: Atom[] } | null {
  let path = ed.cursor.path;
  while (path.length >= 2) {
    const parentPath = path.slice(0, -2);
    const steps = parsePath(path);
    const last = steps[steps.length - 1];
    if (!last) {
      break;
    }
    const { slot } = locate(ed.root, parentPath);
    const atom = slot[last.index];
    if (atom?.t === "call") {
      return { parentPath, index: last.index, atom, slot };
    }
    path = parentPath;
  }
  return null;
}

export function insertDms(ed: EditorState): EditorState {
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (last) {
    const parentPath = ed.cursor.path.slice(0, -2);
    const { slot } = locate(ed.root, parentPath);
    const atom = slot[last.index];
    if (atom?.t === "sexagesimal") {
      if (last.field === "whole") {
        const path = [...parentPath, last.index, fieldToCode("num")];
        return { ...ed, cursor: { path, index: atom.min.length, offset: null } };
      }
      if (last.field === "num") {
        const path = [...parentPath, last.index, fieldToCode("den")];
        return { ...ed, cursor: { path, index: atom.sec.length, offset: null } };
      }
      return { ...ed, cursor: { path: parentPath, index: last.index + 1, offset: null } };
    }
  }
  const { slot } = locate(ed.root, ed.cursor.path);
  const prev = slot[ed.cursor.index - 1];
  if (prev?.t === "sexagesimal") {
    const path = [...ed.cursor.path, ed.cursor.index - 1, fieldToCode(prev.min.length === 0 ? "num" : "den")];
    const inner = prev.min.length === 0 ? prev.min : prev.sec;
    return { ...ed, cursor: { path, index: inner.length, offset: null } };
  }
  if (isValueAtom(prev) && prev) {
    const next = [...slot];
    next[ed.cursor.index - 1] = { t: "sexagesimal", deg: [prev], min: [], sec: [] };
    const root = replaceSlot(ed.root, ed.cursor.path, next);
    const path = [...ed.cursor.path, ed.cursor.index - 1, fieldToCode("num")];
    return { ...ed, root, cursor: { path, index: 0, offset: null } };
  }
  const inserted = insertAtom(ed, { t: "sexagesimal", deg: [], min: [], sec: [] });
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("whole")];
  return { ...inserted, argumentCapture: undefined, cursor: { path, index: 0, offset: null } };
}

export function deleteLeft(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const prev = slot[ed.cursor.index - 1];
  if (prev?.t === "num") {
    const offset = ed.cursor.offset ?? prev.s.length;
    if (offset > 0) {
      const s = prev.s.slice(0, offset - 1) + prev.s.slice(offset);
      const next = [...slot];
      if (s.length > 0) {
        next[ed.cursor.index - 1] = { t: "num", s };
      } else {
        next.splice(ed.cursor.index - 1, 1);
      }
      return {
        ...ed,
        argumentCapture: undefined,
        root: replaceSlot(ed.root, ed.cursor.path, next),
        cursor: { path: ed.cursor.path, index: s.length > 0 ? ed.cursor.index : ed.cursor.index - 1, offset: s.length > 0 ? offset - 1 : null },
      };
    }
    if (ed.cursor.offset === 0) {
      if (ed.cursor.index >= 2) {
        const next = [...slot];
        next.splice(ed.cursor.index - 2, 1);
        return {
          ...ed,
          argumentCapture: undefined,
          root: replaceSlot(ed.root, ed.cursor.path, next),
          cursor: { path: ed.cursor.path, index: ed.cursor.index - 1, offset: 0 },
        };
      }
      return ed;
    }
  }
  if (ed.cursor.index === 0) {
    if (ed.cursor.path.length === 0) {
      return ed;
    }
    const steps = parsePath(ed.cursor.path);
    const last = steps[steps.length - 1];
    if (!last) {
      return ed;
    }
    return { ...ed, argumentCapture: undefined, cursor: { path: ed.cursor.path.slice(0, -2), index: last.index + 1, offset: null } };
  }
  const next = [...slot];
  next.splice(ed.cursor.index - 1, 1);
  return {
    ...ed,
    root: replaceSlot(ed.root, ed.cursor.path, next),
    cursor: { ...ed.cursor, index: ed.cursor.index - 1, offset: null },
  };
}

/** DEL in overwrite mode removes the character/function under the cursor. */
export function deleteAtCursor(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const previous = slot[ed.cursor.index - 1];
  if (previous?.t === "num" && ed.cursor.offset !== null && ed.cursor.offset < previous.s.length) {
    const s = previous.s.slice(0, ed.cursor.offset) + previous.s.slice(ed.cursor.offset + 1);
    const next = [...slot];
    if (s.length > 0) {
      next[ed.cursor.index - 1] = { t: "num", s };
    } else {
      next.splice(ed.cursor.index - 1, 1);
      return {
        ...ed,
        argumentCapture: undefined,
        root: replaceSlot(ed.root, ed.cursor.path, next),
        cursor: { path: ed.cursor.path, index: ed.cursor.index - 1, offset: null },
      };
    }
    return {
      ...ed,
      argumentCapture: undefined,
      root: replaceSlot(ed.root, ed.cursor.path, next),
      cursor: { ...ed.cursor, offset: Math.min(ed.cursor.offset, s.length) },
    };
  }
  if (ed.cursor.index >= slot.length) {
    return ed;
  }
  const current = slot[ed.cursor.index];
  if (current?.t === "num" && ed.cursor.offset !== null && ed.cursor.offset < current.s.length) {
    const s = current.s.slice(0, ed.cursor.offset) + current.s.slice(ed.cursor.offset + 1);
    const next = [...slot];
    if (s.length > 0) {
      next[ed.cursor.index] = { t: "num", s };
    } else {
      next.splice(ed.cursor.index, 1);
    }
    return {
      ...ed,
      argumentCapture: undefined,
      root: replaceSlot(ed.root, ed.cursor.path, next),
      cursor: { ...ed.cursor, offset: s.length > 0 ? Math.min(ed.cursor.offset, s.length) : null },
    };
  }
  const next = [...slot];
  next.splice(ed.cursor.index, 1);
  return {
    ...ed,
    argumentCapture: undefined,
    root: replaceSlot(ed.root, ed.cursor.path, next),
    cursor: { ...ed.cursor, offset: null },
  };
}

export function captureRightArgument(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  let start = ed.cursor.index;
  let offset: number | null = null;
  if (ed.cursor.offset !== null && ed.cursor.index > 0 && slot[ed.cursor.index - 1]?.t === "num") {
    start = ed.cursor.index - 1;
    offset = ed.cursor.offset;
  }
  if (start >= slot.length) {
    return ed;
  }
  const first = slot[start];
  if (!first) {
    return ed;
  }
  let end = start + 1;
  const isAtomicArgument = (atom: Atom): boolean =>
    atom.t === "frac" || atom.t === "mixed" || atom.t === "sexagesimal" || atom.t === "sqrt" ||
    atom.t === "cbrt" || atom.t === "call" || atom.t === "group" || atom.t === "pow" ||
    atom.t === "logb" || atom.t === "nthrt";
  if (!isAtomicArgument(first)) {
    while (end < slot.length) {
      const next = slot[end];
      if (!next || next.t === "colon" || next.t === "comma" || firstField(next)) {
        break;
      }
      if (next.t === "op") {
        const operand = slot[end + 1];
        if (!operand || isAtomicArgument(operand) || operand.t === "op" || operand.t === "colon" || operand.t === "comma") {
          break;
        }
        end += 2;
        continue;
      }
      if (isAtomicArgument(next)) {
        break;
      }
      end += 1;
    }
  }
  return {
    ...ed,
    argumentCapture: { path: [...ed.cursor.path], start, end, offset },
  };
}

export function wrapCapturedArgument(ed: EditorState, make: (atoms: Atom[]) => Atom, field: SlotField): EditorState | null {
  const capture = ed.argumentCapture;
  if (!capture || !pathsEqual(capture.path, ed.cursor.path)) {
    return null;
  }
  const { slot } = locate(ed.root, capture.path);
  const selected = slot.slice(capture.start, capture.end);
  if (selected.length === 0) {
    return null;
  }
  let selectedAtoms = selected;
  let prefix: Atom[] = [];
  if (capture.offset !== null && selected[0]?.t === "num") {
    const text = selected[0].s;
    const before = text.slice(0, capture.offset);
    const after = text.slice(capture.offset);
    prefix = before ? [{ t: "num", s: before }] : [];
    selectedAtoms = after ? [{ t: "num", s: after }, ...selected.slice(1)] : selected.slice(1);
  }
  if (selectedAtoms.length === 0) {
    return null;
  }
  const wrapper = make(selectedAtoms);
  const nextSlot = [...slot];
  nextSlot.splice(capture.start, capture.end - capture.start, ...prefix, wrapper);
  const root = replaceSlot(ed.root, capture.path, nextSlot);
  const path = [...capture.path, capture.start + prefix.length, fieldToCode(field)];
  const inner = getField(wrapper, field) ?? [];
  return {
    ...ed,
    root,
    argumentCapture: undefined,
    cursor: { path, index: inner.length, offset: null },
  };
}

export function moveLeft(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const prev = slot[ed.cursor.index - 1];
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (last) {
    const parentPath = ed.cursor.path.slice(0, -2);
    const { slot: parent } = locate(ed.root, parentPath);
    const template = parent[last.index];
    if (ed.cursor.index === 0 && template?.t === "call" && last.field.startsWith("args")) {
      const argIndex = Number(last.field.slice(4));
      if (argIndex > 0) {
        const previousIndex = argIndex - 1;
        const previousField = `args${previousIndex}` as SlotField;
        const previous = template.args[previousIndex] ?? [];
        return {
          ...ed,
          argumentCapture: undefined,
          cursor: { path: [...parentPath, last.index, fieldToCode(previousField)], index: previous.length, offset: null },
        };
      }
    }
    if (template?.t === "frac" && last.field === "den" && ed.cursor.index === 0) {
      const path = [...parentPath, last.index, fieldToCode("num")];
      const numeratorLast = template.num.at(-1);
      return {
        ...ed,
        argumentCapture: undefined,
        cursor: { path, index: template.num.length, offset: numeratorLast?.t === "num" ? 0 : null },
      };
    }
    if (template?.t === "frac" && last.field === "num" && prev?.t === "num" && ed.cursor.offset === 0) {
      return { ...ed, argumentCapture: undefined, cursor: { path: parentPath, index: last.index, offset: null } };
    }
  }
  if (prev?.t === "num") {
    const offset = ed.cursor.offset ?? prev.s.length;
    if (offset > 0) {
      return { ...ed, argumentCapture: undefined, cursor: { ...ed.cursor, offset: offset - 1 } };
    }
    return { ...ed, argumentCapture: undefined, cursor: { path: ed.cursor.path, index: ed.cursor.index - 1, offset: null } };
  }
  if (ed.cursor.index > 0) {
    const field = firstField(prev);
    if (field && prev) {
      const inner = getField(prev, field) ?? [];
      const path = [...ed.cursor.path, ed.cursor.index - 1, fieldToCode(field)];
      return { ...ed, argumentCapture: undefined, cursor: { path, index: inner.length, offset: null } };
    }
    return { ...ed, argumentCapture: undefined, cursor: { ...ed.cursor, index: ed.cursor.index - 1, offset: null } };
  }
  if (ed.cursor.path.length === 0) {
    const last = slot[slot.length - 1];
    return { ...ed, argumentCapture: undefined, cursor: { path: [], index: slot.length, offset: last?.t === "num" ? last.s.length : null } };
  }
  if (!last) {
    return ed;
  }
  return { ...ed, argumentCapture: undefined, cursor: { path: ed.cursor.path.slice(0, -2), index: last.index, offset: null } };
}

export function moveRight(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const prev = slot[ed.cursor.index - 1];
  if (prev?.t === "num" && ed.cursor.offset !== null) {
    if (ed.cursor.offset < prev.s.length) {
      return { ...ed, argumentCapture: undefined, cursor: { ...ed.cursor, offset: ed.cursor.offset + 1 } };
    }
    if (ed.cursor.path.length === 0 && ed.cursor.index >= slot.length) {
      return { ...ed, argumentCapture: undefined, cursor: { path: [], index: 0, offset: slot[0]?.t === "num" ? 0 : null } };
    }
    if (ed.cursor.index >= slot.length && ed.cursor.path.length > 0) {
      const steps = parsePath(ed.cursor.path);
      const last = steps[steps.length - 1];
      if (last) {
        const parentPath = ed.cursor.path.slice(0, -2);
        const { slot: parent } = locate(ed.root, parentPath);
        const atom = parent[last.index];
        const nextField = nextSlotField(atom, last.field);
        if (nextField && atom) {
          const next = getField(atom, nextField) ?? [];
          return {
            ...ed,
            argumentCapture: undefined,
            cursor: { path: [...parentPath, last.index, fieldToCode(nextField)], index: next.length, offset: null },
          };
        }
        // A Natural template's final slot is exited by the first RIGHT at
        // the end of its last number. The old path left a null offset in the
        // slot and required a second RIGHT, keeping the next operator inside
        // Abs/group/call templates.
        return { ...ed, argumentCapture: undefined, cursor: { path: parentPath, index: last.index + 1, offset: null } };
      }
    }
    return { ...ed, argumentCapture: undefined, cursor: { ...ed.cursor, offset: null } };
  }
  if (ed.cursor.index < slot.length) {
    const cur = slot[ed.cursor.index];
    if (cur?.t === "num") {
      return { ...ed, argumentCapture: undefined, cursor: { path: ed.cursor.path, index: ed.cursor.index + 1, offset: 0 } };
    }
    const field = firstField(cur);
    if (field && cur) {
      const path = [...ed.cursor.path, ed.cursor.index, fieldToCode(field)];
      return { ...ed, argumentCapture: undefined, cursor: { path, index: 0, offset: null } };
    }
    return { ...ed, argumentCapture: undefined, cursor: { ...ed.cursor, index: ed.cursor.index + 1, offset: null } };
  }
  if (ed.cursor.path.length === 0) {
    return { ...ed, argumentCapture: undefined, cursor: { path: [], index: 0, offset: slot[0]?.t === "num" ? 0 : null } };
  }
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (!last) {
    return ed;
  }
  const parentPath = ed.cursor.path.slice(0, -2);
  const { slot: parent } = locate(ed.root, parentPath);
  const atom = parent[last.index];
  const nextField = nextSlotField(atom, last.field);
  if (nextField && atom) {
    const inner = getField(atom, nextField) ?? [];
    const path = [...parentPath, last.index, fieldToCode(nextField)];
    return { ...ed, argumentCapture: undefined, cursor: { path, index: inner.length, offset: null } };
  }
  return { ...ed, argumentCapture: undefined, cursor: { path: parentPath, index: last.index + 1, offset: null } };
}

function firstField(atom: Atom | undefined): SlotField | null {
  if (!atom) {
    return null;
  }
  switch (atom.t) {
    case "frac":
      return "num";
    case "mixed":
      return "whole";
    case "sqrt":
    case "cbrt":
    case "neg":
    case "abs":
    case "post":
    case "angle":
    case "group":
      return "inner";
    case "nthrt":
      return "n";
    case "pow":
      return "base";
    case "logb":
      return "base";
    case "call":
      return "args0";
    default:
      return null;
  }
}

function nextSlotField(atom: Atom | undefined, field: SlotField): SlotField | null {
  if (!atom) {
    return null;
  }
  switch (atom.t) {
    case "frac":
      return field === "num" ? "den" : null;
    case "mixed":
      if (field === "whole") {
        return "num";
      }
      if (field === "num") {
        return "den";
      }
      return null;
    case "sexagesimal":
      if (field === "whole") {
        return "num";
      }
      if (field === "num") {
        return "den";
      }
      return null;
    case "nthrt":
      return field === "n" ? "inner" : null;
    case "pow":
      return field === "base" ? "exp" : null;
    case "logb":
      return field === "base" ? "arg" : null;
    case "call": {
      if (!field.startsWith("args")) {
        return null;
      }
      const next = Number(field.slice(4)) + 1;
      return next < atom.args.length ? `args${next}` as SlotField : null;
    }
    default:
      return null;
  }
}

export function moveDown(ed: EditorState): EditorState {
  return moveVerticalSlot(ed, "down");
}

export function moveUp(ed: EditorState): EditorState {
  return moveVerticalSlot(ed, "up");
}

function moveVerticalSlot(ed: EditorState, direction: "up" | "down"): EditorState {
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (!last) {
    return ed;
  }
  const parentPath = ed.cursor.path.slice(0, -2);
  const { slot } = locate(ed.root, parentPath);
  const atom = slot[last.index];
  if (!atom) {
    return ed;
  }
  const vertical: Partial<Record<SlotField, SlotField>> = direction === "up"
    ? { den: "num", base: "exp", inner: "n", arg: "base", args1: "args0", args2: "args1" }
    : { num: "den", exp: "base", n: "inner", args0: "args1", args1: "args2" };
  const field = vertical[last.field];
  if (!field || !getField(atom, field)) {
    return ed;
  }
  const target = getField(atom, field) ?? [];
  return {
    ...ed,
    argumentCapture: undefined,
    cursor: {
      path: [...parentPath, last.index, fieldToCode(field)],
      index: Math.min(ed.cursor.index, target.length),
      offset: null,
    },
  };
}

export function clearEditor(ed: EditorState): EditorState {
  return { ...emptyEditor(), insertMode: ed.insertMode };
}

export function editorFromAtoms(atoms: Atom[], cursorIndex?: number): EditorState {
  const end = atoms.length;
  const boundary = cursorIndex === undefined ? end : Math.min(end, Math.max(0, cursorIndex));
  const at = atoms[boundary];
  const inNumber = cursorIndex !== undefined && at?.t === "num";
  return {
    root: atoms,
    cursor: {
      path: [],
      index: inNumber ? boundary + 1 : boundary,
      offset: inNumber ? 0 : null,
    },
    insertMode: "insert",
  };
}

export function byteCount(atoms: Atom[]): number {
  let n = 0;
  const walk = (xs: Atom[]) => {
    for (const a of xs) {
      switch (a.t) {
        case "num":
          n += a.s.length;
          break;
        case "frac":
          n += 4;
          walk(a.num);
          walk(a.den);
          break;
        case "mixed":
          n += 6;
          walk(a.whole);
          walk(a.num);
          walk(a.den);
          break;
        case "sexagesimal":
          n += 4;
          walk(a.deg);
          walk(a.min);
          walk(a.sec);
          break;
        case "sqrt":
        case "cbrt":
        case "neg":
        case "abs":
        case "group":
          n += 3;
          walk(a.inner);
          break;
        case "post":
        case "angle":
          n += 3;
          walk(a.inner);
          break;
        case "nthrt":
          n += 6;
          walk(a.n);
          walk(a.inner);
          break;
        case "pow":
          n += 4;
          walk(a.base);
          walk(a.exp);
          break;
        case "logb":
          n += 6;
          walk(a.base);
          walk(a.arg);
          break;
        case "call":
          if (scientificConstantByCallName(a.name)) {
            n += scientificCallLabel(a.name)?.length ?? 1;
            break;
          }
          if (unitConversionByCallName(a.name)) {
            n += scientificCallLabel(a.name)?.length ?? 1;
            for (const arg of a.args) {
              walk(arg);
            }
            break;
          }
          n += a.name.length + 2;
          for (const arg of a.args) {
            walk(arg);
          }
          break;
        default:
          n += 1;
      }
    }
  };
  walk(atoms);
  return n;
}

/** E-12: retain the newest replay entries within the approximate 200-byte budget. */
export function trimHistory(entries: HistoryEntry[], maxBytes = 200): HistoryEntry[] {
  let used = 0;
  const kept: HistoryEntry[] = [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry) {
      continue;
    }
    const expressionCost = entry.baseN
      ? entry.baseN.tokens.reduce((total, token) => {
          switch (token.t) {
            case "num":
              return total + token.digits.length + (token.suffix === null ? 0 : 1);
            case "op":
              return total + token.op.length;
            case "not":
              return total + 3;
            case "negfn":
              return total + 3;
            case "lparen":
            case "rparen":
            case "unary":
              return total + 1;
            case "ans":
              return total + 3;
            default:
              return total;
          }
        }, 0)
      : byteCount(entry.expression);
    const cost = expressionCost + entry.result.display.length;
    if (kept.length > 0 && used + cost > maxBytes) {
      break;
    }
    kept.push(entry);
    used += cost;
  }
  return kept.reverse();
}

export function atomsToLinear(atoms: Atom[], format: DisplayFormat): string {
  const parts: string[] = [];
  const walk = (xs: Atom[]) => {
    for (const a of xs) {
      switch (a.t) {
        case "num":
          parts.push(a.s);
          break;
        case "op":
          parts.push(a.op);
          break;
        case "frac":
          parts.push("(");
          walk(a.num);
          parts.push(format === "LineIO" ? "┘" : "/");
          walk(a.den);
          parts.push(")");
          break;
        case "mixed":
          walk(a.whole);
          if (format === "LineIO") {
            parts.push("┘");
            walk(a.num);
            parts.push("┘");
          } else {
            parts.push(" ");
            walk(a.num);
            parts.push("/");
          }
          walk(a.den);
          break;
        case "sexagesimal":
          walk(a.deg);
          parts.push("°");
          walk(a.min);
          parts.push("′");
          walk(a.sec);
          parts.push("″");
          break;
        case "sqrt":
          parts.push("√(");
          walk(a.inner);
          parts.push(")");
          break;
        case "cbrt":
          parts.push("∛(");
          walk(a.inner);
          parts.push(")");
          break;
        case "nthrt":
          parts.push("(");
          walk(a.n);
          parts.push("√");
          walk(a.inner);
          parts.push(")");
          break;
        case "pow":
          parts.push("(");
          walk(a.base);
          parts.push(")^(");
          walk(a.exp);
          parts.push(")");
          break;
        case "logb":
          parts.push("log(");
          walk(a.base);
          parts.push(",");
          walk(a.arg);
          parts.push(")");
          break;
        case "call":
          if (scientificConstantByCallName(a.name)) {
            parts.push(scientificCallLabel(a.name) ?? a.name);
            break;
          }
          if (unitConversionByCallName(a.name)) {
            a.args.forEach((arg) => walk(arg));
            parts.push(scientificCallLabel(a.name) ?? a.name);
            break;
          }
          parts.push(callLinearName(a.name));
          parts.push("(");
          a.args.forEach((arg, i) => {
            if (i) {
              parts.push(",");
            }
            walk(arg);
          });
          parts.push(a.closed ? ")" : "");
          break;
        case "group":
          parts.push("(");
          walk(a.inner);
          parts.push(a.closed ? ")" : "");
          break;
        case "var":
          parts.push(a.name);
          break;
        case "sym":
          parts.push(a.name === "pi" ? "π" : a.name === "preAns" ? "PreAns" : a.name === "ans" ? "Ans" : a.name);
          break;
        case "cplxfmt":
          parts.push(a.fmt);
          break;
        case "post":
          walk(a.inner);
          parts.push(
            a.op === "sq" ? "²" : a.op === "cube" ? "³" : a.op === "inv" ? "⁻¹" : a.op === "fact" ? "!" : a.op === "pct" ? "%" : "°′″",
          );
          break;
        case "neg":
          parts.push("(-)");
          walk(a.inner);
          break;
        case "abs":
          parts.push("|");
          walk(a.inner);
          parts.push("|");
          break;
        case "angle":
          walk(a.inner);
          parts.push(a.unit);
          break;
        case "colon":
          parts.push(":");
          break;
        case "comma":
          parts.push(",");
          break;
        case "placeholder":
          parts.push("□");
          break;
        default: {
          const _never: never = a;
          return _never;
        }
      }
    }
  };
  walk(atoms);
  return parts.join("");
}

export function pathsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, i) => value === b[i]);
}

export function childPath(slotPath: number[], atomIndex: number, field: SlotField): number[] {
  return [...slotPath, atomIndex, fieldToCode(field)];
}

/** Split `atomsToLinear` at the editor cursor. `before + after` equals the linear string. */
export function atomsToLinearSplit(
  atoms: Atom[],
  format: DisplayFormat,
  cursor: Cursor,
): { before: string; after: string } {
  const before: string[] = [];
  const after: string[] = [];
  let side: "before" | "after" = "before";
  const emit = (text: string) => {
    (side === "before" ? before : after).push(text);
  };

  const walk = (xs: Atom[], slotPath: number[]) => {
    const atSlot = pathsEqual(slotPath, cursor.path);
    for (let i = 0; i < xs.length; i += 1) {
      const a = xs[i];
      if (!a) {
        continue;
      }
      if (atSlot && a.t === "num" && i === cursor.index - 1 && cursor.offset !== null) {
        emit(a.s.slice(0, cursor.offset));
        side = "after";
        emit(a.s.slice(cursor.offset));
        continue;
      }
      if (atSlot && i === cursor.index && side === "before") {
        side = "after";
      }
      switch (a.t) {
        case "num":
          emit(a.s);
          break;
        case "op":
          emit(a.op);
          break;
        case "frac":
          emit("(");
          walk(a.num, childPath(slotPath, i, "num"));
          emit(format === "LineIO" ? "┘" : "/");
          walk(a.den, childPath(slotPath, i, "den"));
          emit(")");
          break;
        case "mixed":
          walk(a.whole, childPath(slotPath, i, "whole"));
          if (format === "LineIO") {
            emit("┘");
            walk(a.num, childPath(slotPath, i, "num"));
            emit("┘");
          } else {
            emit(" ");
            walk(a.num, childPath(slotPath, i, "num"));
            emit("/");
          }
          walk(a.den, childPath(slotPath, i, "den"));
          break;
        case "sexagesimal":
          walk(a.deg, childPath(slotPath, i, "whole"));
          emit("°");
          walk(a.min, childPath(slotPath, i, "num"));
          emit("′");
          walk(a.sec, childPath(slotPath, i, "den"));
          emit("″");
          break;
        case "sqrt":
          emit("√(");
          walk(a.inner, childPath(slotPath, i, "inner"));
          emit(")");
          break;
        case "cbrt":
          emit("∛(");
          walk(a.inner, childPath(slotPath, i, "inner"));
          emit(")");
          break;
        case "nthrt":
          emit("(");
          walk(a.n, childPath(slotPath, i, "n"));
          emit("√");
          walk(a.inner, childPath(slotPath, i, "inner"));
          emit(")");
          break;
        case "pow":
          emit("(");
          walk(a.base, childPath(slotPath, i, "base"));
          emit(")^(");
          walk(a.exp, childPath(slotPath, i, "exp"));
          emit(")");
          break;
        case "logb":
          emit("log(");
          walk(a.base, childPath(slotPath, i, "base"));
          emit(",");
          walk(a.arg, childPath(slotPath, i, "arg"));
          emit(")");
          break;
        case "call":
          if (scientificConstantByCallName(a.name)) {
            emit(scientificCallLabel(a.name) ?? a.name);
            break;
          }
          if (unitConversionByCallName(a.name)) {
            a.args.forEach((arg, argIndex) => walk(arg, childPath(slotPath, i, `args${argIndex}` as SlotField)));
            emit(scientificCallLabel(a.name) ?? a.name);
            break;
          }
          emit(callLinearName(a.name));
          emit("(");
          a.args.forEach((arg, argIndex) => {
            if (argIndex) {
              emit(",");
            }
            const field = `args${argIndex}` as SlotField;
            walk(arg, childPath(slotPath, i, field));
          });
          emit(a.closed ? ")" : "");
          break;
        case "group":
          emit("(");
          walk(a.inner, childPath(slotPath, i, "inner"));
          emit(a.closed ? ")" : "");
          break;
        case "var":
          emit(a.name);
          break;
        case "sym":
          emit(a.name === "pi" ? "π" : a.name === "preAns" ? "PreAns" : a.name === "ans" ? "Ans" : a.name);
          break;
        case "cplxfmt":
          emit(a.fmt);
          break;
        case "post":
          walk(a.inner, childPath(slotPath, i, "inner"));
          emit(
            a.op === "sq" ? "²" : a.op === "cube" ? "³" : a.op === "inv" ? "⁻¹" : a.op === "fact" ? "!" : a.op === "pct" ? "%" : "°′″",
          );
          break;
        case "neg":
          emit("(-)");
          walk(a.inner, childPath(slotPath, i, "inner"));
          break;
        case "abs":
          emit("|");
          walk(a.inner, childPath(slotPath, i, "inner"));
          emit("|");
          break;
        case "angle":
          walk(a.inner, childPath(slotPath, i, "inner"));
          emit(a.unit);
          break;
        case "colon":
          emit(":");
          break;
        case "comma":
          emit(",");
          break;
        case "placeholder":
          emit("□");
          break;
        default: {
          const _never: never = a;
          return _never;
        }
      }
    }
    if (atSlot && cursor.index >= xs.length && side === "before") {
      side = "after";
    }
  };

  walk(atoms, []);
  return { before: before.join(""), after: after.join("") };
}

export function prepareForBinaryOp(ed: EditorState, lineIO = false): EditorState {
  if (ed.cursor.path.length < 2) {
    return ed;
  }
  const parentPath = ed.cursor.path.slice(0, -2);
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (!last) {
    return ed;
  }
  const { slot } = locate(ed.root, parentPath);
  const atom = slot[last.index];
  if (!atom) {
    return ed;
  }
  switch (atom.t) {
    case "call":
      if (atom.name === SCI10_CALL_NAME) {
        return closeGroupOrCall(ed);
      }
      return ed;
    case "group":
    case "pow":
    case "logb":
    case "nthrt":
    case "abs":
      return ed;
    case "frac":
    case "mixed":
      if (last.field === "den") {
        if (lineIO) {
          return { ...ed, cursor: { path: parentPath, index: last.index + 1, offset: null } };
        }
        // Operators typed after entering a fraction denominator remain in the
        // denominator.  The selected E-8 worked example enters `1+√2`
        // without parentheses, so promoting `+` to the outer slot produces a
        // different expression (`2+2√2`) instead of the printed quotient.
        return ed;
      }
      return ed;
    case "sexagesimal":
      return { ...ed, cursor: { path: parentPath, index: last.index + 1, offset: null } };
    case "sqrt":
    case "cbrt":
    case "neg":
    case "post":
    case "angle":
      return closeGroupOrCall(ed);
    default:
      return ed;
  }
}

export { cloneEditor };
