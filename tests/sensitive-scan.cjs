const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tracked = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString('utf8').split('\0').filter(Boolean))];
const forbiddenFiles = [/(^|\/)wrangler\.toml$/i, /(^|\/)\.dev\.vars$/i, /(^|\/)\.env(?:\..*)?$/i, /(^|\/)\.sensitive-scan\.local\./i, /\.(?:png|jpe?g|webp|zip|sqlite3?|db|bundle|sql|pem|key|p12|pfx)$/i, /(^|\/)(?:travel-backup|travel-template|.*-progress).*\.json$/i, /(^|\/)(?:backups|archives|exports)\//i];
const forbiddenText = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?token|secret|password)\s*[=:]\s*["'][^"']{8,}["']/i,
  /(?:sk-[A-Za-z0-9_-]{20,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})/
];
// Optional owner-specific rules stay outside the public repository.
if (process.env.PRIVATE_SCAN_RULES) {
  const rules = JSON.parse(fs.readFileSync(process.env.PRIVATE_SCAN_RULES, 'utf8'));
  for (const rule of rules.patterns || []) forbiddenText.push(new RegExp(rule, 'i'));
}
const issues = [];

for (const relative of tracked) {
  if (relative === 'tests/sensitive-scan.cjs') continue;
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) continue;
  if (forbiddenFiles.some(pattern => pattern.test(relative))) issues.push(`${relative}: private/generated file must not be tracked`);
  let content;
  try { content = fs.readFileSync(absolute, 'utf8'); } catch { continue; }
  forbiddenText.forEach(pattern => {
    if (pattern.test(content)) issues.push(`${relative}: possible sensitive value detected`);
  });
  if (!relative.startsWith('vendor/') && relative !== 'package-lock.json') {
    for (const email of content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []) {
      if (!/@(?:users\.noreply\.github\.com|example\.(?:com|org|test|invalid))$/i.test(email)) {
        issues.push(`${relative}: non-example email address detected`);
      }
    }
  }
}

assert.deepEqual(issues, [], `Sensitive-data scan failed:\n${issues.join('\n')}`);
console.log(`Sensitive-data scan passed for ${tracked.length} tracked files.`);
