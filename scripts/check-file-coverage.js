#!/usr/bin/env node
/**
 * Per-file coverage floor.
 *
 * The global threshold in package.json guards the aggregate (>=75% lines), but
 * a single brand-new untested file can hide behind a healthy average. This
 * script fails the build if ANY collected source file has zero line coverage,
 * enforcing the rule that every file must have *some* test coverage.
 *
 * Run after `jest --coverage` (which writes coverage/coverage-summary.json via
 * the json-summary reporter).
 */
const fs = require('fs');
const path = require('path');

const SUMMARY = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

if (!fs.existsSync(SUMMARY)) {
  console.error(
    '[check-file-coverage] coverage/coverage-summary.json not found — run `npm run test:coverage` first.',
  );
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
const offenders = [];

for (const [file, data] of Object.entries(summary)) {
  if (file === 'total') continue;
  const lines = data.lines || {};
  // A file with executable lines but 0% covered has no test exercising it.
  if (typeof lines.pct === 'number' && lines.total > 0 && lines.pct === 0) {
    offenders.push(path.relative(path.join(__dirname, '..'), file));
  }
}

if (offenders.length > 0) {
  console.error('\n[check-file-coverage] The following files have NO test coverage:');
  for (const f of offenders) console.error(`  - ${f}`);
  console.error('\nEvery source file must have at least some test coverage. Add a test.\n');
  process.exit(1);
}

console.log('[check-file-coverage] OK — every collected source file has some coverage.');
