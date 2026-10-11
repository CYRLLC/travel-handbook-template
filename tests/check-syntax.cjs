const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['app.js', 'travel-store.js', 'travel-manager.js', 'trip.config.js', 'map.js', 'weather.js', 'sw.js'];
for (const file of files) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
console.log(`Syntax checks passed for ${files.length} application files.`);
