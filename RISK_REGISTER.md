# RISK_REGISTER.md

| Risk | Likelihood | Impact | Detection | Mitigation | Status |
| --- | --- | --- | --- | --- | --- |
| Wrong target-model behavior imported | Medium | Critical | Source/model audit | Evidence classes; 115/C extras excluded; PreAns not promoted | Open — PDF is 115/C; PreAns UNCONFIRMED |
| Numerical engine divergence | High | Critical | Golden + edge tests | decimal.js; native-float audit | Mitigated for COMP; ties NHR |
| GitHub Pages not enabled | High | High | `gh api .../pages` | Workflow present; Ver=BLOCKED | BLOCKED until repo Pages on |
| Coordinate calibration error | High | High | `?debug=true` + Playwright | Shared transform | NEEDS HUMAN REVIEW |
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
| Unbounded `call.name` / mode data in COMP AST | Medium | High | Architecture audit | TABLE uses `TableSession`; BASE-N uses `BaseNToken[]`; COMP `call.name` still free | Open for COMP; TABLE/BASE-N traps mitigated |
| BASE-N overflow wrap vs Math ERROR | Medium | Medium | Official range table without wrap rule | Clone errors instead of wrapping; documented NHR | Open — NHR vs hardware |
