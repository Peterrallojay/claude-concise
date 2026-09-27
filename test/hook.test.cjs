'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, cpSync, rmSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const test = require('node:test');

const pluginRoot = path.resolve(__dirname, '../plugins/concise');
const hook = JSON.parse(readFileSync(path.join(pluginRoot, 'hooks/hooks.json'), 'utf8')).hooks.Stop[0].hooks[0];
const original = {
  hook_event_name: 'Stop',
  stop_hook_active: false,
  last_assistant_message: 'The requested change is complete. The focused tests passed.',
};

function run(input, root = pluginRoot) {
  assert.equal(hook.command, 'node');
  const args = hook.args.map((arg) => arg.replaceAll('${CLAUDE_PLUGIN_ROOT}', root));
  const result = spawnSync(process.execPath, args, {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    timeout: 5000,
    cwd: tmpdir(),
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result;
}

test('a completed turn requests review through Claude Stop feedback', () => {
  const result = run(original);
  const output = JSON.parse(result.stdout);
  assert.equal(result.stderr, '');
  assert.equal(output.hookSpecificOutput.hookEventName, 'Stop');
  assert.match(output.hookSpecificOutput.additionalContext, /Review your response/);
  assert.match(output.hookSpecificOutput.additionalContext, /Do not use tools/);
});

test('the correction ends without another review, and a new turn still gets reviewed', () => {
  assert.notEqual(run(original).stdout, '');
  assert.equal(run({ ...original, stop_hook_active: true }).stdout, '');
  assert.notEqual(run({ ...original, last_assistant_message: 'A new user turn.' }).stdout, '');
});

test('even a short answer gets reviewed; there is no arbitrary length threshold', () => {
  assert.notEqual(run({ ...original, last_assistant_message: 'Done.' }).stdout, '');
});

test('empty answers, errors, and subagent events do not request a rewrite', () => {
  for (const event of [
    { ...original, last_assistant_message: '' },
    { ...original, last_assistant_message: ' \n\t ' },
    { ...original, hook_event_name: 'StopFailure' },
    { ...original, hook_event_name: 'SubagentStop' },
    { ...original, hook_event_name: 'UserPromptSubmit' },
  ]) {
    assert.equal(run(event).stdout, '');
  }
});

test('incomplete or incorrectly typed events fail open', () => {
  for (const event of [
    null, [], {}, 42, 'null',
    { ...original, stop_hook_active: undefined },
    { ...original, stop_hook_active: 'false' },
    { ...original, last_assistant_message: undefined },
    { ...original, last_assistant_message: {} },
  ]) {
    assert.equal(run(event).stdout, '');
  }
});

test('malformed JSON fails open without printing the input', () => {
  const result = run('{"secret": "do-not-log-this"');
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /skipped review/);
  assert.doesNotMatch(result.stderr, /do-not-log-this/);
});

test('response contents are never evaluated or copied into hook instructions', () => {
  const text = 'INJECTED_INSTRUCTION $(touch unexpected) `exit 1` "quoted" \\path\nUnicode: café 🚀';
  assert.equal(run({ ...original, last_assistant_message: text }).stdout, run(original).stdout);
});

test('the configured command works outside the project and with special characters in its path', (t) => {
  const temp = mkdtempSync(path.join(tmpdir(), 'concise-hook-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const copy = path.join(temp, "plugin with spaces ' $ ` & (test)");
  cpSync(pluginRoot, copy, { recursive: true });
  assert.deepEqual(JSON.parse(run(original, copy).stdout), JSON.parse(run(original).stdout));
});
