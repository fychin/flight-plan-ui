# Agent Instructions

Use these repository-specific rules when making changes. Keep work focused and grounded in the existing codebase.

## What to do

- Inspect relevant implementation and tests before editing; trace existing UI, routing, and API behavior.
- Make the smallest change that meets the request, preserving existing behavior unless asked otherwise.
- Follow established React, TypeScript, and CSS patterns. Prefer existing dependencies and explicit types.
- Build UI around user tasks: clear hierarchy, predictable interactions, responsive layouts, and visible feedback for loading, errors, empty results, and success.
- Preserve accessibility: semantic HTML, labels and accessible names, visible focus, and sufficient contrast. Do not rely on color alone to convey meaning.
- Follow React practices: keep state minimal and local, derive values instead of duplicating state, use stable keys, clean up effects, and avoid unnecessary renders or abstractions.
- Before changing API or pagination behavior, verify the contract in [`src/types/flightPlan.ts`](src/types/flightPlan.ts) and [`src/api/flightPlan.ts`](src/api/flightPlan.ts).
- Add or update focused tests for changed behavior using the existing Vitest and Testing Library setup.
- Run checks only when requested or needed to diagnose or validate an issue. Report what was run and any checks that could not be run.
- Review the final changes for unintended edits.

## What not to do

- Do not assume API fields, endpoints, pagination semantics, or fallback behavior; verify them in code, tests, or project documentation.
- Do not expose or copy secrets. Keep credentials and local environment files out of source, tests, documentation, and logs.
- Do not make unrelated refactors, reformat whole files, or change conventions without a task-related reason.
- Do not weaken types, lint rules, tests, or accessibility to make a change pass. Avoid `any`, unsafe casts, and ignored errors unless justified by existing patterns.
- Do not add dependencies for functionality already available in the project or platform.
- Do not leave debug output, temporary files, generated artifacts, or obsolete commented-out code.
- Do not claim checks passed unless you ran them and observed success.
