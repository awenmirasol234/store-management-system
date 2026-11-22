# Contributing

## Before changing code

1. Read `AGENTS.md`.
2. Read the affected module and its related tests.
3. Inspect callers, routes, repositories, fixtures, exports, and configuration.
4. Check `git status` and preserve changes you did not make.
5. Identify the smallest complete change that satisfies the request.

## Implementation rules

- Keep dependencies inside the architecture boundaries described in [`ARCHITECTURE.md`](ARCHITECTURE.md).
- Reuse existing helpers, errors, repositories, and components before adding new code.
- Keep business rules in backend domain/application code.
- Validate input at every trust boundary.
- Preserve transaction and rollback behavior.
- Do not add dependencies, abstractions, or configuration without a concrete need.
- Do not commit secrets, databases, uploads, build output, or temporary files.
- Update related documentation when behavior or structure changes.

## Tests

Run backend tests for backend changes:

```bash
cd backend
npm test
```

Run frontend tests and the production build for frontend changes:

```bash
cd frontend
npm test
npm run build
```

Run focused checks for the changed behavior, then run the broader relevant suite. Add tests for new business rules, validation, calculations, persistence behavior, API contracts, or critical UI flows.

For documentation and configuration changes, run:

```bash
git diff --check
```

Report any check that could not run. Do not claim an unrun command passed.

## Review checklist

Before finishing:

- Review the complete diff.
- Confirm all affected callers, tests, fixtures, exports, configuration, and documentation are updated.
- Confirm no unrelated files changed.
- Confirm errors remain user-safe and secrets are not exposed.
- Confirm changed business rules have boundary and failure tests.
- Confirm the final response states what changed, what passed, and what remains unchecked.

## Docker verification

Use the deployment instructions in [`docs/docker-deployment.md`](docs/docker-deployment.md) for Compose operations. Do not run commands that delete the database volume unless the data loss is explicitly intended and confirmed.
