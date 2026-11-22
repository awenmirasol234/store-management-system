# Contributing

## Before changing code or documentation

1. Read `AGENTS.md` and the relevant documentation.
2. Inspect the affected module, callers, tests, fixtures, exports, and configuration.
3. Check `git status` and preserve changes you did not make.
4. Choose the smallest complete change.
5. Keep business rules in domain/application code and keep documentation aligned with actual behavior.

## Implementation rules

- Follow the boundaries in [`ARCHITECTURE.md`](ARCHITECTURE.md).
- Reuse existing helpers, errors, repositories, and components.
- Validate input at every trust boundary.
- Preserve transaction and rollback behavior.
- Do not add dependencies, abstractions, or configuration without a concrete need.
- Do not commit secrets, databases, uploads, build output, or temporary files.

## Verification

Backend changes:

```bash
cd backend
npm test
```

Frontend changes:

```bash
cd frontend
npm test
npm run build
```

Documentation or configuration changes:

```bash
git diff --check
```

Run focused checks first, then the broader relevant suite. Report checks that could not run.

## Review checklist

- Review the complete diff.
- Confirm callers, tests, fixtures, exports, configuration, and related documentation are updated.
- Confirm no unrelated files changed.
- Confirm errors remain user-safe and secrets are not exposed.
- Confirm new business rules have boundary and failure tests.
- State completed checks and remaining risks in the final summary.

## Docker safety

Use [`docs/docker-deployment.md`](docs/docker-deployment.md) for Compose operations. Do not run commands that delete the database volume unless data loss is explicitly intended and confirmed.
