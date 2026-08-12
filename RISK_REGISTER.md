# RISK_REGISTER.md

| Risk | Likelihood | Impact | Detection | Mitigation | Status |
| --- | --- | --- | --- | --- | --- |
| Wrong target-model behavior imported | Medium | Critical | Source/model audit | Hardware lock; 115/C extras excluded | Open — PDF is 115/C combined |
| Numerical engine divergence | High | Critical | Golden tests | decimal.js policy layer | Mitigated for COMP examples |
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
| GitHub Pages not enabled | High | High | Deploy job | Workflow present; live URL after Pages enable | BLOCKED until repo Pages on |
