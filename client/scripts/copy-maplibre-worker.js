/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const packageDist = path.resolve(__dirname, '../node_modules/maplibre-gl/dist');
const packageRoot = path.resolve(__dirname, '../node_modules/maplibre-gl');
const outputDirectory = path.resolve(__dirname, '../public/maplibre');

fs.mkdirSync(outputDirectory, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  fs.copyFileSync(path.join(packageDist, file), path.join(outputDirectory, file));
}
fs.copyFileSync(path.join(packageRoot, 'LICENSE.txt'), path.join(outputDirectory, 'LICENSE.txt'));
console.log('Prepared MapLibre worker assets.');
