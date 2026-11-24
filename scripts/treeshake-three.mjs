import fs from 'node:fs';
import path from 'node:path';

// Codemod: replace `import * as THREE from 'three'` with named imports of the
// THREE.* identifiers actually used in each file, and rewrite THREE.* refs.

const files = process.argv.slice(2);

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const used = new Set([...source.matchAll(/\bTHREE\.(\w+)/g)].map((m) => m[1]));
  if (!used.size) continue;
  const names = [...used].sort();
  const replacement = `import { ${names.join(', ')} } from 'three';\n`;
  const rewritten = source
    .replace(/import \* as THREE from 'three';\n/, replacement)
    .replace(/\bTHREE\./g, '');
  if (!rewritten.includes(replacement.trim())) continue;
  fs.writeFileSync(file, rewritten);
  console.log(`tree-shaken ${file}: ${names.length} imports`);
}
