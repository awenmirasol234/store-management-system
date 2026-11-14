# AGENTS.md

This file defines the architectural standards, project structure, and conventions for all contributors and AI agents working in `store-management-system`.

## 1. Architecture Standard: Clean Architecture

This project follows **Module-First Clean Architecture**. Business logic and domain rules are isolated from frameworks, databases, and UI so modules (such as the reusable inventory and flexible selling module) remain portable and testable.

### The Dependency Rule

Dependencies **must only point inward**:

```text
presentation  ──▶  application  ──▶  domain
infrastructure ───────────────────▶  application / domain
```

- **`domain/`**: Pure business entities, value objects, validation schemas, domain errors, and port interfaces (e.g., repository and transaction interfaces). **Must never** import from `application/`, `infrastructure/`, `presentation/`, databases, HTTP frameworks, or UI libraries.
- **`application/`**: Use cases / interactors, input/output DTOs, and orchestration logic. Depends **only** on `domain/` (and `shared/`). Interacts with persistence or external services exclusively through `domain/` interfaces.
- **`infrastructure/`**: Concrete adapters implementing `domain/` and `application/` interfaces (database/ORM repositories, transaction managers, barcode/printing adapters). Depends on `domain/` and `application/`.
- **`presentation/`**: Controllers, API route handlers, CLI commands, or UI components. Depends on `application/` use cases and DTOs—never directly on `infrastructure/` or database clients.

---

## 2. Standard Project Structure

```text
src/
├── shared/                      # Cross-cutting domain-safe primitives & utilities
│   ├── domain/                  # Shared value objects, decimal helpers, base errors
│   └── application/             # Shared port interfaces (e.g., UnitOfWork / TransactionManager)
└── <module>/                    # Reusable feature module (e.g., inventory, sales)
    ├── domain/
    │   ├── entities/            # Domain models & Zod schemas
    │   ├── value-objects/       # Money, Quantity, Unit, Barcode, etc.
    │   ├── repositories/        # Repository & port interfaces (no implementations)
    │   └── errors/              # Domain-specific errors
    ├── application/
    │   ├── use-cases/           # Single-responsibility use cases (e.g., ProcessSale, StockIn)
    │   └── dto/                 # Use case input/output contracts
    ├── infrastructure/
    │   ├── persistence/         # DB/ORM repository & transaction implementations
    │   └── mappers/             # Persistence <-> Domain mappers
    └── presentation/
        ├── http/                # API controllers / route handlers
        └── ui/                  # UI components / view models (if applicable)

tests/
└── <module>/
    ├── domain/                  # Pure unit tests for entities, rules, and validations
    ├── application/             # Use-case unit tests with in-memory repository fakes
    ├── infrastructure/          # Integration tests for adapters/repositories
    └── presentation/            # Controller / UI tests
```

> **Current status:** Shared primitives reside in `src/shared/domain/` and inventory domain entities reside in `src/inventory/domain/entities/` with domain unit tests in `tests/inventory/domain/models.test.ts`.

---

## 3. Domain & Module Guidelines

Reference specification: `product-inventory-and-selling-options.md`.

1. **Single Unified Selling Model**: Keep product inventory in one `base_unit` on `Product`, and represent packs, bundles, promos, weight/volume presets, and flexible prices via `ProductSellingOption` (`quantity` in `base_unit` + `price`). Do not create separate pricing models per selling method.
2. **Numeric Precision**:
   - Monetary values (`cost_price`, `selling_price`, `price`, `unit_price`, `unit_cost`, `subtotal`, totals): `DECIMAL(12, 2)`.
   - Inventory and option quantities (`current_stock`, `reorder_level`, `quantity`, `base_quantity`): `DECIMAL(12, 4)` to support fractional weights and volumes.
3. **Transactional Integrity**: Sales processing and inventory deductions must execute atomically via a `UnitOfWork` / transaction port defined in `domain/` or `shared/application/`.
4. **Historical Snapshots**: Always snapshot `unit_price`, `unit_cost`, `option_name_snapshot`, and `base_quantity` on `SalesItem` at the time of sale so historical revenue and profit remain accurate when prices or costs change.
5. **Backend Validation**: Enforce all quantity, stock, payment, and sign rules in domain/application layers regardless of UI validation.

---

## 4. Coding Standards

- **Tech Stack**: TypeScript (`strict: true`), Zod for schema/boundary validation, Vitest for testing.

### Simplicity
- Write simple, readable, and maintainable code.
- Prefer basic syntax over clever or unnecessarily complex solutions.
- Avoid overengineering and unnecessary abstractions.

### Variable Naming
- Use descriptive, concise, and meaningful names for variables, functions, classes, and files that communicate purpose and meaning.
- Avoid single-letter variable names (`x`, `i`, `j`, `n`), except for conventional loop counters when appropriate.
- Avoid unclear two-letter variable names (`id`, `db`, `fn`) when a more descriptive name improves readability.
- Apply consistent naming conventions throughout the codebase.

### Single Responsibility
- Give each function and class one clear purpose.
- Keep functions focused and reasonably small; separate unrelated operations into different functions.

### Loose Coupling
- Keep components independent and avoid unnecessary dependencies between modules.
- Depend on abstractions (`domain/` interfaces) where appropriate and use dependency injection when it improves flexibility and testability.

### Code Reusability
- Reuse existing utilities and shared logic (`src/shared/`) instead of duplicating implementations.
- Do not introduce abstractions without a practical need.

### Error Handling
- Validate inputs at appropriate boundaries (Zod schemas and domain rules).
- Handle expected errors explicitly; never silently ignore errors.
- Provide clear and useful error messages.

### Comments and Documentation
- Write comments only when they provide useful context; explain *why* something is done rather than repeating *what* the code does.
- Document important business rules and complex logic.
- Keep comments short, accurate, and up to date.

---

## 5. Testing, Maintainability & Implementation Workflow

### Testing
- Write unit tests for important business logic covering normal cases, edge cases (negative stock, fractional quantities, precision limits, transaction sign rules), and failure cases.
- Keep code easy to test independently: `domain/` and `application/` tests must run without a database or network using in-memory fakes for repository ports.

### Maintainability
- Follow existing project conventions and preserve existing functionality.
- Avoid unrelated changes; remove dead code only when safe.
- Keep documentation consistent with the implementation.

### Implementation Practices
- Inspect existing code and understand the architecture and dependencies before making changes.
- Improve existing implementations instead of rewriting them unnecessarily.
- Choose the simplest solution that satisfies the requirements.
- Verify changes with required checks before completing work:
  ```bash
  npm run typecheck
  npm test
  ```
