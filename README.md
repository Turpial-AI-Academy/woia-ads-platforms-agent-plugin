# woia-ads-platforms

## Operation
Capability-specific actions, exact authority/effect helpers and schemas are in
`skills/woia-ads-platforms/`. Load that skill's `references/CONTRACT.md` before use.
The deterministic provider exports `apply`, `initialState` and `projectSucceeded`;
authority/effect helpers export `dispatchPending` and `digest`.
Persist JSON state with atomic compare-and-swap before invoking a qualified adapter.
Remote unknown outcomes require reconciliation; local intents are not successful effects.

Portable Agent Plugin for Guard paid campaign, targeting, budget and conversion effects owned by Ads..

## Capability

~~~text
DISCOVER -> DECIDE -> IMPLEMENT -> VALIDATE -> REPORT
~~~

The plugin adapts to the repository it operates on without requiring the consumer to adopt WOIA's authoring toolchain.

## Portable package

~~~text
plugin.json
README.md
LICENSE
skills/**
# optional source diagnostic when retained by the repository
CHECKSUMS.sha256
~~~

`CHECKSUMS.sha256` is optional source evidence, not a required portable/release artifact.

Add `mcp.json` only if the capability genuinely requires MCP.

## Consumer requirements

Document only genuine capability/runtime requirements here. Do not list maintenance Node/pnpm/Mise/Docker unless the portable capability itself truly needs them.

## Development

~~~text
mise install
mise run bootstrap
mise run doctor
mise run ci:fast
mise run ci:extended
mise run release:check
~~~
