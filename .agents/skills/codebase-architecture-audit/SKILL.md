---
name: codebase-architecture-audit
description: Audit an existing codebase and recommend the simplest maintainable structure without modifying project files.
---

# Codebase Architecture Audit

Audit the existing codebase and recommend the simplest structure that fits its
actual requirements, implementation, technology, and maintenance needs.

Do not redesign the project to match a generic enterprise architecture.
Recommend only changes supported by codebase evidence.

## Strict Audit Constraints

- Do not modify, move, rename, delete, or create project files.
- Do not implement the proposed structure.
- Do not install dependencies.
- Do not rewrite existing functionality.
- Do not introduce architectural patterns without a demonstrated need.
- Preserve existing behavior and established project conventions.
- Stop after presenting the audit and wait for explicit user approval before
  making any changes.

## Audit Procedure

Follow these steps in order:

1. Check the working tree and exclude unrelated changes from the audit.
2. Map the complete project directory and file structure.
3. Read package manifests, lockfiles, build configuration, runtime
   configuration, and test configuration.
4. Inspect representative source files from every application layer and
   feature/module.
5. Trace data flow and dependencies between modules, components, services,
   utilities, repositories, APIs, and external systems.
6. Read existing documentation and agent/development conventions.
7. Identify the architecture and patterns the project actually uses.
8. Compare the current structure with the project's size, complexity,
   technology stack, requirements, workflow, and maintenance needs.
9. Verify suspected problems by checking usage, imports, callers, tests,
   exports, configuration, and runtime references.
10. Separate confirmed problems from optional improvements and intentional
    exceptions.
11. Recommend the smallest safe structural improvement, or state that the
    current structure should remain.

## Inspect for Structural Problems

Check for:

- Files or directories that do not match their responsibilities.
- Unnecessary directory nesting.
- Duplicated code or overlapping responsibilities.
- Tightly coupled modules that should be independent.
- Unnecessary abstractions, services, managers, providers, or design patterns.
- Unused files, directories, dependencies, exports, and configuration.
- Inconsistent naming or file placement.
- Components, services, modules, or utilities with multiple responsibilities.
- Architectural complexity that does not provide current value.
- Documentation that conflicts with the implementation.

Do not report a problem based only on preference. Cite the codebase evidence.
Do not recommend removing or merging anything until its usage is verified.

## Evaluate the Current Architecture

Evaluate whether the current architecture fits:

- The project's size and complexity.
- The technology stack and framework conventions.
- The application's actual requirements.
- The current development and testing workflow.
- The expected maintenance burden.

Prefer the existing architecture when it already satisfies these needs. Do not
force Clean Architecture, layered architecture, microservices, design
patterns, or additional modules without evidence that they solve a real
problem.

## Recommend a Lean Structure

When the current structure needs improvement:

- Prefer clear ownership of files and modules.
- Keep related behavior together.
- Separate responsibilities only when the separation reduces coupling or
  improves testing and navigation.
- Prefer high cohesion and loose coupling.
- Reuse existing utilities and conventions.
- Use descriptive, consistent names.
- Minimize directory nesting.
- Do not create directories for hypothetical future requirements.
- Do not add dependencies when existing code can solve the problem.
- Do not sacrifice readability for architectural complexity.

Provide a directory tree only when it clarifies the recommendation. Keep the
tree limited to relevant directories and explain each important entry.

## Classify Existing Files

Classify each affected file or directory as one of:

- **Keep:** Its location and responsibility match the established structure.
- **Move:** Its responsibility belongs in a different existing or explicitly
  justified directory.
- **Rename:** Its name is unclear or inconsistent with the dominant naming
  pattern.
- **Merge:** It duplicates or unnecessarily separates one responsibility.
- **Remove:** Its usage is verified as absent and its removal is safe.

For every `Move`, `Rename`, `Merge`, or `Remove` recommendation:

- Name the exact path.
- Explain the evidence.
- Identify callers, imports, tests, exports, and configuration that would be
  affected.
- State the smallest safe correction.

## Required Audit Report

Use these sections in the final report:

### 1. Current Structure Assessment

Describe the current organization, dominant architecture, and overall quality.

### 2. Verified Problems

List confirmed structural issues. For each issue, include:

- Exact file or directory.
- Evidence from the codebase.
- Current responsibility or pattern.
- Why it is a structural problem.
- Priority: high, medium, or low.

### 3. Recommended Architecture

Explain the smallest architectural approach that fits the project and why it
fits better than the alternatives considered.

### 4. Proposed Directory Structure

Show the relevant proposed tree with brief descriptions. Do not present
unnecessary hypothetical modules.

### 5. File Organization Recommendations

Classify affected files as Keep, Move, Rename, Merge, or Remove. Verify usage
before recommending removal.

### 6. Improvement Opportunities

List practical, non-essential improvements separately from confirmed problems.
Do not present optional cleanup as required work.

### 7. Prioritized Action Plan

Order recommendations as:

- **High:** Structural problems that materially affect correctness, coupling,
  navigation, or maintenance.
- **Medium:** Improvements that reduce maintenance cost or inconsistency.
- **Low:** Optional cleanup with limited immediate impact.

For every recommendation, state its purpose, expected benefit, affected files,
and smallest safe next step.

## Final Verification

Before presenting the audit:

- Confirm every reported issue is supported by actual codebase evidence.
- Confirm generated files, dependencies, and unrelated changes were excluded.
- Confirm no recommendation requires an unverified assumption.
- Confirm optional improvements are clearly separated from required fixes.
- Review the report for broad rewrites, unnecessary abstractions, and
  architecture imposed without evidence.
- State unresolved conflicts and checks that could not run.
- Do not claim a file, dependency, or module is unused without checking its
  references.

After presenting the report, stop and wait for explicit approval. Do not
automatically implement any recommendation.
