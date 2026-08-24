# RISK_REGISTER.md

| Risk | Likelihood | Impact | Detection | Mitigation | Status |
| --- | --- | --- | --- | --- | --- |
| Wrong target-model behavior imported | Medium | Critical | Source/model audit | Evidence classes; 115/C extras excluded; PreAns not promoted | Open — PDF is 115/C; PreAns UNCONFIRMED |
| Numerical engine divergence | High | Critical | Golden + edge tests | decimal.js; native-float audit | Mitigated for COMP; ties NHR |
| GitHub Pages serving source tree | High | High | Fetch live `index.html` + `/src/main.tsx` | Pages must be GitHub Actions (`dist`) or branch folder `/docs`; do not use `/(root)` | Open — origin 200, calculator blank until source is switched |
| Coordinate calibration error | High | High | overlay on by default + Playwright | Shared transform | NEEDS HUMAN REVIEW |
| Context-window loss during manual ingestion | High | High | Coverage index | Incremental ToC audit | Partial ingestion |
| Golden tests become circular | Medium | Critical | Source IDs in test names | Manual page citations | Mitigated |
| MathLive asset failure offline | Medium | High | Offline/network | MathLive not used | N/A |
| State coupling to React | Medium | High | Headless Vitest | `reduce()` owns semantics | Mitigated |
| Agent thrashing | High | High | Three-attempt cap | Used on operator-exit bug | Mitigated |
| Scope explosion | High | Critical | P0/P1/P2 matrix | P1 modes not blocking COMP | Mitigated |
| False completion | Medium | Critical | Acceptance floor | Report VERIFIED counts only | Process |
| Physical reference unavailable | Medium | Medium | TARGET_SPEC | Differential = N/A | Accepted |
| Browser/platform mismatch | Medium | Medium | Honest coverage | Chromium + Playwright devices | Partial |
| Documentation drift | Medium | Medium | Stable IDs | Incremental docs | Process |
| Corrupt persist injected as CalcState | Medium | High | persist.test.ts | `isPersistedCalcState` rejects unknown/incomplete nested state (D-015) | Mitigated for schema-v1 shape; Atom trees still unchecked |
| Unbounded `call.name` / mode data in COMP AST | Medium | High | Architecture audit; `call-name-gate.test.ts` | TABLE uses `TableSession`; BASE-N uses `BaseNToken[]`; CMPLX reuses COMP AST with `complexOk`; STAT uses `StatSession` + gated `stat-*` calls; EQN uses `EqnSession`; MATRIX uses `MatrixSession` + gated `mat-*` calls; VECTOR uses `VectorSession` + gated `vct-*` calls; COMP injection of `mat-*`/`vct-*`/`stat-*` → Syntax ERROR; MODE wipe clears editor | Open for COMP type (`string`); key-driven leak mitigated (D-023) |
| STAT menu numbering vs hardware | Medium | Low | Official HTML dropped key numbers | Clone uses 115/C numbering; documented NHR | Open — NHR vs hardware |
| STAT Q/R vs hardware | Medium | Low | Official Ex5 illustrates P and t only | Q/R from 115/C diagrams (`INFERRED`) | Open — NHR vs hardware |
| BASE-N overflow wrap vs Math ERROR | Medium | Medium | Official range table without wrap rule | Clone errors instead of wrapping; documented NHR | Open — NHR vs hardware |
| CMPLX LineIO a/bi layout vs two-line HTML LCD | Medium | Low | Official Linear Display note | Clone keeps expr/result LCD; documented NHR | Open — NHR vs hardware |
| Complex STO of A–F | Medium | Medium | Official memories survive; no STO example on CMPLX page | Math ERROR on nonzero imag this phase | PARTIAL |
| EQN no-solution / infinite wording vs hardware | Medium | Low | Official HTML omitted 115/C E-36 message | Clone uses `No Solution` / `Infinitely Many`; not Can't Solve | Open — NHR vs hardware |
| EQN cubic root order beyond official Ex5 | Medium | Low | Official Ex5 is not numeric-sorted | Rational-root negative-first then quadratic ±√ | Open — NHR vs hardware |
| EQN extra `=` after last coefficient | Medium | Low | 115/C sequences; official HTML says `=` solves | Clone `readyToSolve` flag | Open — INFERRED |
| MATRIX menu numbering / dim 7–9 LCD | Medium | Low | Official HTML dropped key glyphs | Clone uses 115/C 1–9 Dim sizes; first LCD page shows 1–6 | Open — NHR vs hardware |
| MATRIX singular inverse error class | Medium | Low | Official errors page names Dimension ERROR for dims only | Clone uses Math ERROR (illegal op / ÷0) | Open — INFERRED |
| MATRIX persist across power-off | Medium | Medium | Official MATRIX page silent | Session stripped like TABLE/STAT/EQN | Open — INFERRED / NHR |
| VECTOR menu numbering / 2D cross | Medium | Low | Official HTML dropped Ex5 vector and most key glyphs | Clone embeds 2D×2D as (0,0,a1b2−a2b1); 115/C menu 1–7 | Open — NHR vs hardware |
| VECTOR persist across power-off | Medium | Medium | Official VECTOR page silent | Session stripped like TABLE/STAT/EQN/MATRIX | Open — INFERRED / NHR |
| VECTOR algebra importing MATRIX modules | Low | Medium | Import graph | `CalcDimensionError` moved to `numeric.ts` (D-023); VECTOR no longer imports `matrixNumeric.ts` | Mitigated |
| `7/7 VERIFIED` read as hardware clone | Medium | Critical | Capability labels | Explicit source-vs-hardware labels in `POST_MAJOR_MODE_AUDIT.md` / `CAPABILITY_MATRIX.md` | Process — keep language precise |
| CLR Memory policy differs by session | Medium | Low | `runConfirm("memory")` | MATRIX/VECTOR registers wiped; STAT/EQN/TABLE sessions kept | Open — INFERRED / NHR; do not unify without evidence |
