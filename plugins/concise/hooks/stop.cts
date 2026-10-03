// Edit stop.cts, then run npm run build to update stop.cjs.
import { readFileSync } from 'node:fs';

const review = `Review your response and rewrite it to be concise. Sacrifice grammar for concision. Write in ASD-STE100 technical English.

Do not use tools. Output only the rewrite.`;

function main(): void {
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // A malformed event must not keep the user's session running.
    process.stderr.write('concise: could not read hook input; skipped review.\n');
    return;
  }

  if (
    typeof input !== 'object' ||
    input === null ||
    !('hook_event_name' in input) ||
    input.hook_event_name !== 'Stop' ||
    !('stop_hook_active' in input) ||
    input.stop_hook_active !== false ||
    !('last_assistant_message' in input) ||
    typeof input.last_assistant_message !== 'string' ||
    !input.last_assistant_message.trim()
  ) {
    return;
  }

  // Stop feedback continues the turn. The next Stop has stop_hook_active=true.
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: review,
    },
  }) + '\n');
}

main();
