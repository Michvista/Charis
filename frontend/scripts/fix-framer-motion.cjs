const fs = require('fs');
const path = require('path');

const proxyPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'framer-motion',
  'dist',
  'es',
  'render',
  'components',
  'm',
  'proxy.mjs',
);

const proxySource = "export { createMinimalMotionComponent as m } from './create.mjs';\n";

if (!fs.existsSync(proxyPath)) {
  fs.mkdirSync(path.dirname(proxyPath), { recursive: true });
  fs.writeFileSync(proxyPath, proxySource, 'utf8');
}
