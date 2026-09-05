import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const out = "docs";

function copySkipMaps(src, dest) {
  const st = statSync(src);
  if (st.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const name of readdirSync(src)) {
      if (name.endsWith(".map")) {
        continue;
      }
      copySkipMaps(join(src, name), join(dest, name));
    }
    return;
  }
  cpSync(src, dest);
}

mkdirSync(out, { recursive: true });
const generated = /^(index\.html|keymap\.json|manifest\.webmanifest|sw\.js|workbox-.*\.js|assets|icons|\.nojekyll)$/;
for (const name of readdirSync(out)) {
  if (!generated.test(name)) {
    continue;
  }
  rmSync(join(out, name), { recursive: true, force: true });
}
for (const name of readdirSync(dist)) {
  if (name.endsWith(".map")) {
    continue;
  }
  copySkipMaps(join(dist, name), join(out, name));
}
writeFileSync(join(out, ".nojekyll"), "");
