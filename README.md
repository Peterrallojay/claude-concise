# Claude Concise

An automatic editing pass for Claude Code. Shorter responses. Clearer technical English.

A real `Stop` hook runs after each completed turn and sends Claude back to review its response. One review pass, with a loop guard. No skill to invoke.

## Install

Requires current [Claude Code](https://code.claude.com/docs/en/setup) and [Node.js 22+](https://nodejs.org/). Tested with Claude Code 2.1.283.

Run in your terminal:

```sh
claude plugin marketplace add Peterrallojay/claude-concise
claude plugin install concise@claude-concise
```

Start a new Claude Code session. The hook runs automatically across projects.

## The prompt

> Review your response and rewrite it to be concise. Sacrifice grammar for concision. Write in ASD-STE100 technical English.
>
> Do not use tools. Output only the rewrite.

The original answer stays visible, followed by the rewrite. A loop guard limits the hook to one editing pass. It uses your existing Claude session and adds model usage; no separate API key or service.

ASD-STE100 is a style reference, not a compliance claim. The hook guarantees the review instruction on eligible turns, not shorter or more accurate writing.

## Remove

```sh
claude plugin uninstall concise@claude-concise
```

Start a new session to apply the change.

## Development

The source and tests use TypeScript. The compiled hook ships with the plugin, so users do not need TypeScript or a build step. Run `npm run build` after editing the source and commit the updated `stop.cjs`.

```sh
npm ci
npm test
claude plugin validate .
claude plugin validate ./plugins/concise
claude --plugin-dir ./plugins/concise
```

The implementation is [one TypeScript file](plugins/concise/hooks/stop.cts), registered in [hooks.json](plugins/concise/hooks/hooks.json). It reads the hook event from standard input and returns [Stop feedback](https://code.claude.com/docs/en/hooks#stop-decision-control). It skips empty responses, malformed input, and turns already continuing from any Stop hook. It does not read transcripts, write files, or make network requests.

MIT licensed. Built by [Peter Rallojay](https://github.com/Peterrallojay).
