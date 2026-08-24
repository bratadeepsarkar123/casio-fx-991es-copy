import type { ReactNode } from "react";
import type { Atom, Cursor, DisplayFormat, ResultValue } from "../calc/types.ts";
import { childPath, pathsEqual } from "../calc/editor.ts";

function Caret() {
  return <span data-testid="lcd-caret" className="lcd-caret" aria-hidden="true" />;
}

function Placeholder() {
  return <span className="nat-ph" data-testid="nat-ph" />;
}

function slotNodes(
  xs: Atom[],
  format: DisplayFormat,
  cursor: Cursor | null,
  showCaret: boolean,
  slotPath: number[],
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const atSlot = cursor !== null && pathsEqual(slotPath, cursor.path);
  const pushCaret = () => {
    if (showCaret) {
      nodes.push(<Caret key={`caret-${slotPath.join(".")}-${nodes.length}`} />);
    }
  };

  for (let i = 0; i < xs.length; i += 1) {
    const a = xs[i];
    if (!a) {
      continue;
    }
    if (atSlot && a.t === "num" && i === cursor.index - 1 && cursor.offset !== null) {
      nodes.push(<span key={`n-${slotPath.join(".")}-${i}-a`}>{a.s.slice(0, cursor.offset)}</span>);
      pushCaret();
      nodes.push(<span key={`n-${slotPath.join(".")}-${i}-b`}>{a.s.slice(cursor.offset)}</span>);
      continue;
    }
    if (atSlot && i === cursor.index) {
      pushCaret();
    }
    nodes.push(
      <span key={`a-${slotPath.join(".")}-${i}`}>{atomNode(a, format, cursor, showCaret, slotPath, i)}</span>,
    );
  }
  if (atSlot && cursor.index >= xs.length) {
    pushCaret();
  }
  return nodes;
}

function wrapSlot(
  xs: Atom[],
  format: DisplayFormat,
  cursor: Cursor | null,
  showCaret: boolean,
  slotPath: number[],
): ReactNode {
  const nodes = slotNodes(xs, format, cursor, showCaret, slotPath);
  if (nodes.length === 0) {
    return showCaret && cursor !== null && pathsEqual(slotPath, cursor.path) ? <Caret /> : <Placeholder />;
  }
  return nodes;
}

function atomNode(
  a: Atom,
  format: DisplayFormat,
  cursor: Cursor | null,
  showCaret: boolean,
  slotPath: number[],
  i: number,
): ReactNode {
  switch (a.t) {
    case "num":
      return a.s;
    case "op":
      return a.op;
    case "frac":
      return (
        <span className="nat-frac" data-testid="nat-frac">
          <span className="nat-frac-num">{wrapSlot(a.num, format, cursor, showCaret, childPath(slotPath, i, "num"))}</span>
          <span className="nat-frac-bar" />
          <span className="nat-frac-den">{wrapSlot(a.den, format, cursor, showCaret, childPath(slotPath, i, "den"))}</span>
        </span>
      );
    case "mixed":
      return (
        <span className="nat-mixed" data-testid="nat-mixed">
          {wrapSlot(a.whole, format, cursor, showCaret, childPath(slotPath, i, "whole"))}
          <span className="nat-frac" data-testid="nat-frac">
            <span className="nat-frac-num">{wrapSlot(a.num, format, cursor, showCaret, childPath(slotPath, i, "num"))}</span>
            <span className="nat-frac-bar" />
            <span className="nat-frac-den">{wrapSlot(a.den, format, cursor, showCaret, childPath(slotPath, i, "den"))}</span>
          </span>
        </span>
      );
    case "sqrt":
      return (
        <span className="nat-sqrt" data-testid="nat-sqrt">
          <span className="nat-radical">√</span>
          <span className="nat-vinculum">
            <span className="nat-vinculum-bar" />
            <span className="nat-radicand">{wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}</span>
          </span>
        </span>
      );
    case "cbrt":
      return (
        <span className="nat-cbrt" data-testid="nat-cbrt">
          <span className="nat-index">3</span>
          <span className="nat-radical">√</span>
          <span className="nat-vinculum">
            <span className="nat-vinculum-bar" />
            <span className="nat-radicand">{wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}</span>
          </span>
        </span>
      );
    case "nthrt":
      return (
        <span className="nat-nthrt" data-testid="nat-nthrt">
          <span className="nat-index">{wrapSlot(a.n, format, cursor, showCaret, childPath(slotPath, i, "n"))}</span>
          <span className="nat-radical">√</span>
          <span className="nat-vinculum">
            <span className="nat-vinculum-bar" />
            <span className="nat-radicand">{wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}</span>
          </span>
        </span>
      );
    case "pow":
      return (
        <span className="nat-pow" data-testid="nat-pow">
          <span>{wrapSlot(a.base, format, cursor, showCaret, childPath(slotPath, i, "base"))}</span>
          <span className="nat-exp">{wrapSlot(a.exp, format, cursor, showCaret, childPath(slotPath, i, "exp"))}</span>
        </span>
      );
    case "logb":
      return (
        <>
          log
          <sub>{wrapSlot(a.base, format, cursor, showCaret, childPath(slotPath, i, "base"))}</sub>(
          {wrapSlot(a.arg, format, cursor, showCaret, childPath(slotPath, i, "arg"))})
        </>
      );
    case "call":
      return (
        <>
          {a.name}(
          {a.args.map((arg, argIndex) => (
            <span key={`arg-${argIndex}`}>
              {argIndex ? "," : null}
              {wrapSlot(
                arg,
                format,
                cursor,
                showCaret,
                argIndex === 0 ? childPath(slotPath, i, "args0") : [...childPath(slotPath, i, "args0"), argIndex, 99],
              )}
            </span>
          ))}
          {a.closed ? ")" : ""}
        </>
      );
    case "group":
      return (
        <>
          ({wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}
          {a.closed ? ")" : ""}
        </>
      );
    case "var":
      return a.name;
    case "sym":
      return a.name === "pi" ? "π" : a.name === "preAns" ? "PreAns" : a.name === "ans" ? "Ans" : a.name;
    case "cplxfmt":
      return a.fmt;
    case "post": {
      const mark =
        a.op === "sq" ? "²" : a.op === "cube" ? "³" : a.op === "inv" ? "⁻¹" : a.op === "fact" ? "!" : a.op === "pct" ? "%" : "°′″";
      return (
        <>
          {wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}
          <span className="nat-post-sup">{mark}</span>
        </>
      );
    }
    case "neg":
      return (
        <>
          (−)
          {wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}
        </>
      );
    case "abs":
      return (
        <span className="nat-abs" data-testid="nat-abs">
          <span className="nat-abs-bar" />
          {wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}
          <span className="nat-abs-bar" />
        </span>
      );
    case "angle":
      return (
        <>
          {wrapSlot(a.inner, format, cursor, showCaret, childPath(slotPath, i, "inner"))}
          {a.unit}
        </>
      );
    case "colon":
      return ":";
    case "comma":
      return ",";
    case "placeholder":
      return <Placeholder />;
    default: {
      const _never: never = a;
      return _never;
    }
  }
}

export function NaturalExpression(props: {
  atoms: Atom[];
  format: DisplayFormat;
  cursor: Cursor | null;
  showCaret: boolean;
}): ReactNode {
  const nodes = slotNodes(props.atoms, props.format, props.cursor, props.showCaret, []);
  if (nodes.length === 0) {
    return props.showCaret ? <Caret /> : "\u00a0";
  }
  return nodes;
}

export function NaturalResultView(props: { result: ResultValue; mathO: boolean }): ReactNode {
  const { result, mathO } = props;
  if (!mathO) {
    return result.display;
  }
  if ((result.naturalKind === "fraction" || result.naturalKind === "mixed") && result.fraction) {
    return (
      <span className="nat-mixed" data-testid="nat-result-frac">
        {result.fraction.mixed ? <span>{result.fraction.mixed}</span> : null}
        <span className="nat-frac" data-testid="nat-frac">
          <span className="nat-frac-num">{result.fraction.num}</span>
          <span className="nat-frac-bar" />
          <span className="nat-frac-den">{result.fraction.den}</span>
        </span>
      </span>
    );
  }
  return result.display;
}
