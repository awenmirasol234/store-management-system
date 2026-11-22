# Agent Instructions

These rules apply to every coding agent working in this repository.

## Required Preparation

- Read the files that directly affect the requested change before editing.
- Inspect the callers, tests, fixtures, exports, configuration, and related documentation for every function or file you change.
- Read `.agents/skills/ponytail/SKILL.md` and apply its `full` mode before making code or documentation changes.
- Check the working tree before editing.
- Keep the change limited to the requested behavior. Do not rewrite unrelated code or documentation.
- Preserve existing behavior unless the request explicitly changes it.
- Ask for clarification when requirements, behavior, authorization, or an implementation choice is unclear.

## Documentation Responsibilities

- Keep `AGENTS.md` limited to persistent rules for coding agents.
- Put project overview, prerequisites, setup, installation, and usage instructions in `README.md`.
- Put detailed architecture, folder responsibilities, and design decisions in `ARCHITECTURE.md` or the relevant file under `docs/`.
- Put contribution workflow and collaboration procedures in `CONTRIBUTING.md`.
- Put specialized repeatable procedures in the applicable `SKILL.md`.
- Keep `docs/product-inventory-and-selling-options.md` as the source for inventory and selling rules.
- Keep `docs/store-management-system-plan.md` as the source for the broader architecture and implementation plan.
- Update related documentation when a code change makes documented behavior inaccurate.
- Do not copy detailed specifications, roadmaps, or setup procedures into `AGENTS.md`.

## Architecture

- Keep dependencies pointing inward:
  - Presentation calls application use cases.
  - Application use cases depend on domain rules and injected ports.
  - Infrastructure implements domain ports.
  - Domain code does not import frameworks, databases, UI code, repositories, or use cases.
- Keep business rules in `domain.js` or `use-cases.js`, not in routes, repositories, database adapters, or React components.
- Keep database, HTTP, Express, and third-party code outside the domain layer.
- Use dependency injection for repositories, clocks, ID generators, and unit-of-work implementations.
- Keep each module focused on one business area.
- Follow the existing flat module layout. Do not add nested folders inside a module or barrel `index.js` files.
- If a module file becomes too large, split it into flat sibling files with clear responsibilities.

## Repository Structure

Use the existing structure unless the requested change requires otherwise:

```text
backend/
├── src/
│   ├── shared/                  # Shared validation, errors, decimal helpers, and ports
│   ├── db/                      # SQLite connection, schema, and unit of work
│   ├── <module>/                # inventory, sales, credit, reports, or future modules
│   │   ├── domain.js            # Entities, rules, errors, and port contracts
│   │   ├── use-cases.js         # Application workflows
│   │   ├── sqlite-repo.js       # SQLite adapter
│   │   └── routes.js            # Express routes
│   ├── app.js                   # Composition root and middleware
│   └── server.js                # HTTP server entry point
└── tests/                       # Backend Vitest tests

frontend/
└── src/
    ├── api.js                   # Shared REST API client
    ├── format.js                # Currency, quantity, and date formatting
    ├── products.js              # Shared product helpers
    ├── cart.js                  # Cart calculations
    ├── navigation.js            # Navigation definitions
    ├── components/              # Shared React components
    ├── pages/                   # Page-level React screens
    ├── App.jsx
    └── main.jsx

frontend/tests/                  # Frontend Vitest tests
```

## Backend Rules

- Use Node.js, Express, ESM JavaScript, plain SQL, built-in `node:sqlite`, and Vitest.
- Do not add TypeScript, Zod, or another state/validation framework unless the user explicitly requests it.
- Define domain entities, validation, errors, and repository contracts in `domain.js`.
- Define application workflows as small use cases in `use-cases.js`.
- Implement repository contracts in `sqlite-repo.js` or another dialect-specific adapter.
- Keep repository and unit-of-work methods asynchronous, even when SQLite operations are synchronous.
- Generate IDs in the application through the injected ID generator.
- Keep dialect-specific SQL, schema, pragmas, and parameter handling inside database adapters.
- Return `{ data }` for successful API responses.
- Let the shared error handler return `{ error: { code, message } }` for failures.
- Keep routes responsible for HTTP input/output and delegation. Do not put business rules or direct database calls in routes.
- Validate all request input at the HTTP boundary and validate business rules again in the domain/application layer.
- Reject invalid types, missing fields, unsupported values, negative quantities, invalid prices, and invalid payment amounts before persistence.
- Never expose internal errors, credentials, file paths, or sensitive data in API responses.

## Data and Business Rules

- Keep product inventory in one `base_unit`.
- Represent packs, bundles, promotions, weight or volume presets, and flexible prices with `ProductSellingOption`.
- Store monetary values at two-decimal precision.
- Store inventory and option quantities at four-decimal precision.
- Store SQLite money as integer centavos (`× 100`) and quantities as integer ten-thousandths (`× 10,000`).
- Convert scaled values only at repository mapping boundaries.
- Process sales, inventory deductions, and related records in one unit-of-work transaction.
- Snapshot `unit_price`, `unit_cost`, `option_name_snapshot`, and `base_quantity` when recording a sale.
- Update product cost from the latest stock-in unit cost while preserving historical snapshots.
- Record every inventory movement and enforce its transaction-type sign rules.
- Enforce barcode uniqueness across products and selling options.
- Soft-delete products with `deleted_at`; exclude deleted products from normal queries, POS results, and low-stock alerts.
- Use `is_active = false` to disable products, selling options, categories, suppliers, or other supported records without deleting history.
- Use PHP (`₱`) for money and `Asia/Manila` (`UTC+8`) for business-day calculations.

## Frontend Rules

- Use React, Vite, plain JavaScript/JSX, Tailwind CSS, and built-in React state.
- Do not add an external state-management library for local feature state.
- Send all backend requests through `frontend/src/api.js`.
- Inspect `frontend/src/components/` before creating a component.
- Reuse an existing shared component when it meets the requirement.
- Create a shared component only when the UI or behavior is used by multiple pages or clearly belongs to the shared design system.
- Keep shared components independent of page-specific data and workflows.
- Keep page-specific orchestration in `frontend/src/pages/`.
- Keep business calculations in shared helpers such as `cart.js`, `format.js`, or `products.js`, not in large JSX render blocks.
- Preserve keyboard, focus, semantic HTML, readable contrast, and usable mobile layouts.
- Use Inter for all text and digits.
- Keep screens fast to scan: use short labels, clear totals, visible stock alerts, and only the actions needed for the task.
- Do not add decorative content, redundant labels, or filler descriptions.

## JavaScript Style

- Use plain, beginner-readable JavaScript with clear intermediate variables and early returns.
- Use `if`/`else` statements instead of ternary operators.
- Do not use object spread syntax. Use explicit property assignment or `Object.assign`.
- Keep function parameters short and flat. Pass one simple flat object when several related values are required.
- Avoid `Proxy`, `Reflect`, decorators, complex inheritance, mixins, currying, dense functional chains, and clever one-liners.
- Keep each function focused on one responsibility.
- Use `camelCase` for variables and functions, `PascalCase` for classes and React components, and `kebab-case` for files and directories unless an existing convention requires otherwise.
- Use descriptive names. Avoid unclear abbreviations and single-letter variables except for conventional loop counters.
- Reuse existing helpers, errors, validators, repositories, and components before adding new ones.
- Add an abstraction only when the current change has a real repeated need for it.
- Add comments only to explain why non-obvious behavior is required.
- Mark intentional shortcuts with `shortcut: <limit>, <when to upgrade>`.

## Error Handling and Security

- Validate untrusted input before processing, storing, or rendering it.
- Sanitize values before persistence or display when the boundary requires it.
- Handle expected errors explicitly and return clear user-safe messages.
- Never silently ignore a failed operation.
- Preserve transactions and rollback behavior when moving or merging code.
- Do not commit secrets, credentials, local databases, generated build output, temporary files, or environment-specific configuration.
- Confirm destructive or irreversible operations before executing them.

## Testing and Verification

- Add or update a focused test for every new non-trivial branch, loop, parser, money calculation, security rule, or business rule.
- Test valid input, missing input, invalid input, boundary values, and failure behavior.
- Test domain and application logic with in-memory fakes so those tests do not require a database or network.
- Add integration tests for SQLite persistence, transactions, mapping, and rollback behavior when those areas change.
- Add route tests when API status codes, request validation, or response envelopes change.
- Add frontend tests for changed calculations, rendering, responsive navigation, or critical user flows.
- Run the checks relevant to the files changed.
- For backend changes, run:
  ```bash
  cd backend && npm test
  ```
- For frontend changes, run:
  ```bash
  cd frontend && npm test
  cd frontend && npm run build
  ```
- Run `git diff --check` for documentation or configuration changes.
- Report checks that could not run and any remaining risk. Do not claim an unchecked command passed.

## Change Review

- Review the final diff before finishing.
- Confirm that every changed caller, test, fixture, export, configuration entry, and related document is updated.
- Remove only dead code introduced by the change or made clearly safe to remove.
- Do not reset, discard, or overwrite changes that you did not make.
- Keep the final response concise: state the result, list verification performed, and identify skipped checks or remaining risks.
