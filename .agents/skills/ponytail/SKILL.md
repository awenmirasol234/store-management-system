---
name: ponytail
description: >
  Use the smallest complete solution for coding, documentation, refactoring,
  review, dependency, and architecture tasks. Use when the user says
  "ponytail", "be lazy", "simplest solution", "yagni", or complains about
  over-engineering or bloat. Modes: lite, full, ultra.
argument-hint: "[lite|full|ultra|off]"
license: MIT
---

# Ponytail

Use the smallest complete change that solves the user's request.

Do not confuse "smallest" with "incomplete". Finish every required caller,
test, fixture, configuration, export, migration, and documentation update.

## Activation

- Apply `full` mode by default.
- Keep Ponytail active until the user says `stop ponytail` or `normal mode`.
- Switch modes when the user requests `/ponytail lite`, `/ponytail full`, or
  `/ponytail ultra`.
- Turn Ponytail off when the user requests `/ponytail off`.

## Before Editing

- Read the task and the files it directly affects.
- Inspect callers before changing a shared function, component, module, or
  contract.
- Inspect related tests, fixtures, exports, configuration, and documentation.
- Check the working tree before editing.
- Identify data the change could destroy, expose, or invalidate.
- List every location the change must reach.
- Do not expand the scope beyond the requested behavior.

## Choose the Smallest Complete Solution

Use these choices in order:

1. Remove work that does not need to exist.
2. Reuse an existing helper, component, service, dependency, or project pattern.
3. Use a platform or standard-library feature when it solves the problem.
4. Use an installed dependency before adding a new dependency.
5. Write the shortest clear implementation.
6. Add code only when the preceding choices cannot solve the request.

Apply these rules:

- Prefer deletion over addition when both solve the request.
- Do not add speculative options, wrappers, configuration, abstractions,
  conversions, or future-proofing.
- Do not add a dependency for a small amount of code.
- Do not rewrite working code when a focused change is sufficient.
- Choose the option with the correct edge-case behavior when alternatives are
  equally small.
- Keep the existing architecture, interfaces, naming, and project conventions.

## Implementation Rules

- Fix a shared root cause once instead of patching each caller.
- Preserve existing validation and error handling when moving or merging code.
- Keep functions, classes, and modules focused on one responsibility.
- Keep control flow and data transformations easy to read.
- Add one concise comment only when the reason cannot be expressed by the code.
- Mark intentional limitations with:

  ```text
  shortcut: <the limit>, <when to upgrade>
  ```

- Do not use a shortcut to avoid required validation, security, accessibility,
  data-loss protection, or user-requested behavior.

## Safety and Validation

Never cut these requirements:

- Validate all untrusted input at system boundaries.
- Preserve error handling that prevents data loss.
- Preserve security controls and do not expose secrets.
- Preserve accessibility and required hardware calibration.
- Preserve transaction and rollback guarantees.
- Preserve behavior required by the user.

When changing input handling, money, security, persistence, parsing, or
business rules:

- Check valid, invalid, missing, and boundary values.
- Keep failure behavior explicit and user-safe.
- Preserve historical data and compatibility unless the request authorizes a
  breaking change.

## Testing

- Add or update one focused test for each new non-trivial branch, loop, parser,
  money calculation, security rule, persistence rule, or business rule.
- Use an assert-based self-check only when a focused test is not practical.
- Do not add tests solely to increase coverage numbers.
- Run the smallest relevant check first, then run the broader required checks.
- Report checks that could not run.
- Do not claim an unchecked command passed.

## Final Review

Before finishing:

- Review the complete diff.
- Confirm every affected caller, test, fixture, export, configuration entry,
  and documentation file is updated.
- Confirm no unrelated files changed.
- Confirm no secrets, generated files, temporary files, or local data were
  added.
- Confirm the implementation is complete rather than merely minimal.
- State the result first.
- List the checks that passed.
- List skipped checks and remaining risks.

## Modes

### Lite

- Build the requested behavior with the smallest complete change.
- Do not challenge the request unless it is unsafe or impossible.
- Mention a smaller alternative only when it would materially reduce scope.

### Full

- Apply every rule in this skill.
- Inspect the complete change scope before editing.
- Add focused checks for non-trivial logic.
- Report skipped checks and risks.

### Ultra

- Apply every `full` rule.
- Question requirements that add complexity without a clear user benefit.
- Before implementation, recommend removing or simplifying unjustified work.
- Proceed only after selecting the smallest justified scope.
