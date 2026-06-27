# DSS Universe Development Workflow v1.0

## Core idea

DSS Universe is developed through small controlled iterations.

The goal is not to generate a lot of code at once.
The goal is to keep the project stable after every step.

## Main workflow

```txt
Plan
  ↓
Bootstrap
  ↓
Small code step
  ↓
Compile
  ↓
Test
  ↓
Checkpoint
  ↓
Next step
Rules
1. No large uncontrolled code drops

Each implementation step should be small enough to:

understand quickly
compile quickly
debug quickly
test manually
2. Bootstrap scripts first

For new modules or phases, create structure with PowerShell bootstrap scripts.

3. Compile after every step

Every step must end with:

pnpm --filter api start:dev

Expected result:

Found 0 errors. Watching for file changes.
4. Test with PowerShell

API endpoints are tested with:

Invoke-RestMethod

Default API base URL:

http://localhost:3001/api
5. Definition of Done

A task is done only when all required items are complete.

Example:

DTO              ✅
Service          ✅
Repository       ✅
Controller       ✅
Validation       ✅
Exceptions       ✅
Compile          ✅
Manual test      ✅
Docs updated     ✅
6. Backend module standard

Every backend business module follows:

src/modules/<module>/
├── <module>.module.ts
├── <module>.service.ts
├── controllers/
├── dto/
├── interfaces/
├── mappers/
├── repositories/
├── types/
├── constants/
└── exceptions/
7. Architecture review points

Pause and review architecture when:

a new module starts
a repeated pattern appears
imports become confusing
a service starts doing too much
a module begins depending on too many other modules
a workaround appears twice
8. Commit checkpoints

Recommended checkpoint format:

checkpoint: phase-name / step-name

Example:

checkpoint: auth / jwt tokens
Current Auth Milestone
Step 1 — Password Hash ✅
Step 2 — JWT Tokens ✅
Step 3 — Register with tokens
Step 4 — Login with tokens
Step 5 — Refresh
Step 6 — Logout
Step 7 — JWT Strategy
Step 8 — Auth Guard
Step 9 — Current User
Step 10 — Swagger
Project principle

Build slowly enough to stay stable.

Move fast only after the foundation is solid.
```
