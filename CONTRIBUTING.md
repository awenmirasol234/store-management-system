# Contribution Guide

Tactical workflow and requirements for modifying this repository.

---

## 1. Preparation & Inspection

Execute these steps before writing or editing code:

1. **Read Instructions**: Review [AGENTS.md](AGENTS.md) and [.agents/skills/ponytail/SKILL.md](.agents/skills/ponytail/SKILL.md) (`full` mode).
2. **Inspect Callers**: Search for and inspect all callers, tests, fixtures, exports, and configuration for every function, endpoint, or component you plan to touch.
3. **Check Working Tree**: Run `git status`. Do not discard, overwrite, or reset existing changes.
4. **Define Minimal Scope**: Identify the smallest complete change that satisfies the request. Do not refactor unrelated code.

---

## 2. Implementation Rules & Constraints

Follow these rules during development:

- **Clean Architecture Boundaries**: Follow layer boundaries defined in [ARCHITECTURE.md](ARCHITECTURE.md). Domain logic belongs in `domain.js` or `use-cases.js`, never in Express routes, SQLite repositories, or React components.
- **JavaScript Style**: Use plain, beginner-readable ESM JavaScript.
  - No object spread syntax (`...`). Use `Object.assign` or explicit property assignment.
  - No ternary operators (`? :`) for program flow. Use explicit `if` / `else` statements.
  - Keep functions focused on a single responsibility.
- **Data & Scaling**:
  - Keep money values stored as integer centavos (`× 100`).
  - Keep inventory quantities stored as integer ten-thousandths (`× 10,000`).
  - Keep product inventory strictly in the parent product's `base_unit`.
- **Atomic Operations**: Wrap multi-table modifications (sales, inventory deductions, shifts) in a `UnitOfWork` transaction.
- **Dependency Policy**: Reuse existing helpers in `shared/` or `components/` before creating new ones. Do not add external npm packages without explicit authorization.
- **Security & Artifacts**: Never commit secrets, `.env` files, SQLite databases (`*.db`), uploaded images, or build artifacts.

---

## 3. Verification Commands

Run the applicable checks after every code or documentation change:

### Backend Validation

```bash
cd backend
npm test
```

### Frontend Validation

```bash
cd frontend
npm test
npm run build
```

### Documentation & Whitespace Validation

```bash
git diff --check
```

*Note: All checks must run and pass. If any check cannot run, state it explicitly in your summary.*

---

## 4. Pre-Commit Review Checklist

Verify each item before committing or submitting changes:

- [ ] `git diff` reviewed completely for unintended modifications.
- [ ] Every affected caller, test fixture, export, and configuration entry is updated.
- [ ] Boundary and failure test cases exist for new business or persistence logic.
- [ ] Error messages are explicit, user-safe, and do not expose internal paths or credentials.
- [ ] Related documentation in `docs/` is updated if behavior changed.
- [ ] `git status` confirms no untracked databases, logs, or build artifacts.

---

## 5. Docker Operations Safety

When working with Docker Compose:

- Consult [docs/docker-deployment.md](docs/docker-deployment.md) before executing container operations.
- Never run `docker compose down -v` on production or shared environments without confirmed backups, as it permanently removes the `store_data` volume containing the SQLite database and product uploads.
