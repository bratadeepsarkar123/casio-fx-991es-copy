import type { Atom, ComplexFormat, DisplayFormat, EditorState, VarName } from "./types.ts";

export const MAX_BYTES = 99;

export function emptyEditor(): EditorState {
  return {
    root: [],
    cursor: { path: [], index: 0, offset: null },
    insertMode: "insert",
  };
}

export type SlotField = "num" | "den" | "inner" | "exp" | "base" | "arg" | "n" | "whole" | "args0";

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

function fieldToCode(field: SlotField): number {
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
      return field === "args0" ? (atom.args[0] ?? null) : null;
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
      if (field === "args0") {
        const args = [...atom.args];
        args[0] = slot;
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
  const next = [...slot];
  next.splice(ed.cursor.index, 0, atom);
  const root = replaceSlot(ed.root, ed.cursor.path, next);
  return {
    ...ed,
    root,
    cursor: { path: ed.cursor.path, index: ed.cursor.index + 1, offset: null },
  };
}

export function insertDigit(ed: EditorState, d: string): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  const prev = slot[ed.cursor.index - 1];
  if (prev?.t === "num") {
    const offset = ed.cursor.offset ?? prev.s.length;
    const s = prev.s.slice(0, offset) + d + prev.s.slice(offset);
    const next = [...slot];
    next[ed.cursor.index - 1] = { t: "num", s };
    return {
      ...ed,
      root: replaceSlot(ed.root, ed.cursor.path, next),
      cursor: { ...ed.cursor, offset: offset + 1 },
    };
  }
  return insertAtom(ed, { t: "num", s: d });
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

export function insertSqrt(ed: EditorState): EditorState {
  return wrapPrevAs(ed, (inner) => ({ t: "sqrt", inner }), "inner");
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

export function insertLogab(ed: EditorState): EditorState {
  const atom: Atom = { t: "logb", base: [], arg: [] };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("base")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

export function insertCall(ed: EditorState, name: string): EditorState {
  const atom: Atom = { t: "call", name, args: [[]], closed: false };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("args0")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

export function insertAbs(ed: EditorState): EditorState {
  return wrapPrevAs(ed, (inner) => ({ t: "abs", inner }), "inner");
}

export function insertNeg(ed: EditorState): EditorState {
  const atom: Atom = { t: "neg", inner: [] };
  const inserted = insertAtom(ed, atom);
  const path = [...inserted.cursor.path, inserted.cursor.index - 1, fieldToCode("inner")];
  return { ...inserted, cursor: { path, index: 0, offset: null } };
}

export function insertPost(ed: EditorState, op: "sq" | "cube" | "inv" | "fact" | "pct" | "dms"): EditorState {
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
  return insertAtom(ed, { t: "comma" });
}

export function deleteLeft(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  if (ed.cursor.index === 0) {
    if (ed.cursor.path.length === 0) {
      return ed;
    }
    const steps = parsePath(ed.cursor.path);
    const last = steps[steps.length - 1];
    if (!last) {
      return ed;
    }
    return { ...ed, cursor: { path: ed.cursor.path.slice(0, -2), index: last.index + 1, offset: null } };
  }
  const prev = slot[ed.cursor.index - 1];
  if (prev?.t === "num" && prev.s.length > 1) {
    const offset = ed.cursor.offset ?? prev.s.length;
    if (offset > 0) {
      const s = prev.s.slice(0, offset - 1) + prev.s.slice(offset);
      const next = [...slot];
      next[ed.cursor.index - 1] = { t: "num", s: s.length ? s : "0" };
      if (s.length === 0) {
        next.splice(ed.cursor.index - 1, 1);
        return {
          ...ed,
          root: replaceSlot(ed.root, ed.cursor.path, next),
          cursor: { ...ed.cursor, index: ed.cursor.index - 1, offset: null },
        };
      }
      return {
        ...ed,
        root: replaceSlot(ed.root, ed.cursor.path, next),
        cursor: { ...ed.cursor, offset: offset - 1 },
      };
    }
  }
  const next = [...slot];
  next.splice(ed.cursor.index - 1, 1);
  return {
    ...ed,
    root: replaceSlot(ed.root, ed.cursor.path, next),
    cursor: { ...ed.cursor, index: ed.cursor.index - 1, offset: null },
  };
}

export function moveLeft(ed: EditorState): EditorState {
  if (ed.cursor.index > 0) {
    const { slot } = locate(ed.root, ed.cursor.path);
    const prev = slot[ed.cursor.index - 1];
    if (prev?.t === "num" && ed.cursor.offset && ed.cursor.offset > 0) {
      return { ...ed, cursor: { ...ed.cursor, offset: ed.cursor.offset - 1 } };
    }
    const field = firstField(prev);
    if (field && prev) {
      const inner = getField(prev, field) ?? [];
      const path = [...ed.cursor.path, ed.cursor.index - 1, fieldToCode(field)];
      return { ...ed, cursor: { path, index: inner.length, offset: null } };
    }
    return { ...ed, cursor: { ...ed.cursor, index: ed.cursor.index - 1, offset: prev?.t === "num" ? prev.s.length : null } };
  }
  if (ed.cursor.path.length === 0) {
    const { slot } = locate(ed.root, []);
    return { ...ed, cursor: { path: [], index: slot.length, offset: null } };
  }
  const steps = parsePath(ed.cursor.path);
  const last = steps[steps.length - 1];
  if (!last) {
    return ed;
  }
  return { ...ed, cursor: { path: ed.cursor.path.slice(0, -2), index: last.index, offset: null } };
}

export function moveRight(ed: EditorState): EditorState {
  const { slot } = locate(ed.root, ed.cursor.path);
  if (ed.cursor.index < slot.length) {
    const cur = slot[ed.cursor.index];
    if (cur?.t === "num" && (ed.cursor.offset ?? 0) < cur.s.length && ed.cursor.offset !== null) {
      return { ...ed, cursor: { ...ed.cursor, offset: (ed.cursor.offset ?? 0) + 1 } };
    }
    const field = firstField(cur);
    if (field && cur) {
      const path = [...ed.cursor.path, ed.cursor.index, fieldToCode(field)];
      return { ...ed, cursor: { path, index: 0, offset: null } };
    }
    return { ...ed, cursor: { ...ed.cursor, index: ed.cursor.index + 1, offset: null } };
  }
  if (ed.cursor.path.length === 0) {
    return { ...ed, cursor: { path: [], index: 0, offset: null } };
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
    return { ...ed, cursor: { path, index: inner.length === 0 ? 0 : inner.length, offset: null } };
  }
  return { ...ed, cursor: { path: parentPath, index: last.index + 1, offset: null } };
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
    case "nthrt":
      return field === "n" ? "inner" : null;
    case "pow":
      return field === "base" ? "exp" : null;
    case "logb":
      return field === "base" ? "arg" : null;
    default:
      return null;
  }
}

export function moveDown(ed: EditorState): EditorState {
  return moveRight(ed);
}

export function moveUp(ed: EditorState): EditorState {
  return moveLeft(ed);
}

export function clearEditor(ed: EditorState): EditorState {
  return { ...emptyEditor(), insertMode: ed.insertMode };
}

export function editorFromAtoms(atoms: Atom[], cursorIndex?: number): EditorState {
  const end = atoms.length;
  const index = cursorIndex === undefined ? end : Math.min(end, Math.max(0, cursorIndex));
  const at = atoms[index];
  return {
    root: atoms,
    cursor: {
      path: [],
      index,
      offset: at?.t === "num" ? 0 : null,
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
          parts.push(" ");
          walk(a.num);
          parts.push("/");
          walk(a.den);
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
          parts.push(a.name);
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

export function prepareForBinaryOp(ed: EditorState): EditorState {
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
    case "group":
    case "pow":
    case "logb":
    case "nthrt":
    case "abs":
      return ed;
    case "frac":
    case "mixed":
      if (last.field === "den") {
        return { ...ed, cursor: { path: parentPath, index: last.index + 1, offset: null } };
      }
      return ed;
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
