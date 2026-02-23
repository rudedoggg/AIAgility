# CONSTITUTION v1.0
## AgilityAI — AI Development Agent Governance

**Authority**: Project Owner | **Last Updated**: 2026-02-19

This is the **single source of truth** for all AI agents working on this codebase. Whether you're using Cursor, Claude Code, Copilot, or any other AI tool, this document defines how we work.

---

## Table of Contents

0. [Core Philosophy](#0-core-philosophy)
1. [Project Context](#i-project-context)
2. [Quick Start](#ii-quick-start)
3. [Zero-Tolerance Rules](#iii-zero-tolerance-rules)
4. [Workflow](#iv-workflow)
5. [Before You Code Checklist](#v-before-you-code-checklist)
6. [Quality Gates & Enforcement](#vi-quality-gates--enforcement)
7. [Anti-Slop Rules](#vii-anti-slop-rules)
8. [No Workarounds Policy](#viii-no-workarounds-policy)
9. [Cognitive Guardrails](#ix-cognitive-guardrails)
10. [PM Governance](#x-pm-governance)
11. [Session Protocol](#xi-session-protocol)
12. [Success Checklist](#xii-success-checklist)

---

## 0) CORE PHILOSOPHY

### Things You Measure Tend to Get Better

This is the foundational insight that governs how we operate. If something matters, we measure it. If we're not measuring it, it's probably drifting.

**What We Explicitly Measure:**

| Metric | Where Tracked | Why It Matters |
|--------|---------------|----------------|
| TypeScript strict compliance | `npm run check` (tsc) | Code quality over time |
| Zero `any` types | Code review | Prevents type-safety drift |
| Workaround/exception counts | PR reviews | Detects shortcut culture |
| Build success | `npm run build` | System reliability |

**If it isn't being measured, it's probably drifting.**

### Quality Over Speed (But Speed Matters Too)

- A fast wrong answer is worse than a slow right answer
- But a slow right answer that never ships is worthless
- Measure both quality AND velocity; optimize for their product, not either alone

### No Drift Without Detection

Every practice that matters has:
1. A written rule (this document)
2. An enforcement mechanism (hooks, CI, reviews)
3. A measurement (metrics, scores, counts)

If any of these three is missing, the practice will decay.

---

## I) PROJECT CONTEXT

### What Is AgilityAI?

AgilityAI is an AI-powered decision-making and project management tool. It helps users break down projects into goals, research knowledge, and deliverables — with AI chat assistants embedded at every level to help think through decisions.

The app has four main sections:
- **Dashboard** — Project status overview with AI chat
- **Goals** — Goal sections (Context, Objective, Stakeholders, Constraints) with completeness tracking
- **Lab** — Knowledge buckets (Sources, Open Questions, etc.) for research and evidence gathering
- **Deliverables** — Trackable deliverables with status, completeness, and content

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Client (React 19 + Vite + TypeScript)              │
│  ├── Pages (wouter routing)                         │
│  ├── Components (shadcn/ui + Radix UI + Tailwind)   │
│  ├── Data fetching (@tanstack/react-query)          │
│  └── State (React Query + localStorage projectStore)│
│                                                     │
│  ↕ fetch with Authorization: Bearer <JWT>           │
│                                                     │
│  Server (Express 5 + TypeScript) — Railway          │
│  ├── Routes (CRUD + admin, all authenticated)       │
│  ├── Storage layer (IStorage → DatabaseStorage)     │
│  ├── Auth (Supabase JWT verification)               │
│  └── CORS (configured for Vercel frontend)          │
│                                                     │
│  ↕ Drizzle ORM                                      │
│                                                     │
│  PostgreSQL 16                                      │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + TypeScript + Vite 7 | SPA, wouter for routing |
| **UI Components** | shadcn/ui (New York style) + Radix UI | 57+ components, Tailwind v4 |
| **Data Fetching** | @tanstack/react-query | Stale time = Infinity, manual invalidation |
| **Animations** | Framer Motion | Page transitions, panel animations |
| **Drag & Drop** | @dnd-kit | Sortable lists across all pages |
| **Forms** | React Hook Form + Zod resolvers | Runtime validation |
| **Backend** | Express 5 + TypeScript | Node 20, strict mode |
| **Database** | PostgreSQL 16 + Drizzle ORM | Auto migrations, Zod schemas via drizzle-zod |
| **Auth** | Supabase Auth + JWT | First user auto-admin, stateless JWT verification |
| **Deployment** | Vercel (frontend) + Railway (backend) + Supabase (DB + auth) | Client: vite build, Server: esbuild → dist/index.cjs |
| **Package Manager** | npm | |

### Environment Variables

All environment variables are stored in **Railway** (Settings → Variables).

#### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Found in Supabase: Settings → Database → Connection string (URI, Direct connection). |
| `SUPABASE_URL` | Yes | Supabase project URL. Found in Supabase: Settings → API → Project URL. |
| `CORS_ORIGIN` | Yes (production) | Your Vercel frontend URL. Server crashes on startup if missing in production. |
| `PORT` | No | Railway sets this automatically. Defaults to `3001` locally. |
| `NODE_ENV` | No | Railway sets to `production` automatically. Enables SSL for DB and strict CORS. |

#### Frontend (Vercel — build-time only)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Same value as `SUPABASE_URL` above. Found in Supabase: Settings → API → Project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Found in Supabase: Settings → API → Project API keys → anon public. |
| `VITE_API_BASE_URL` | Yes | Your Railway service public domain. Found in Railway: click your service → Settings → Networking → Public Networking. |

### Key Directory Structure

```
client/src/
  pages/             # 16 page components (DashboardPage, GoalsPage, LabPage, etc.)
  components/
    layout/          # AppShell (4-panel resizable grid), Header
    shared/          # ChatWorkspace, SummaryCard, ScopedHistory
    ui/              # 57+ shadcn/ui components — DO NOT hand-roll UI primitives
  hooks/             # use-auth, use-core-queries, use-mobile, use-toast
  lib/               # api.ts, queryClient.ts, projectStore.ts, utils.ts, types.ts
server/
  index.ts           # Express app setup + middleware
  routes.ts          # All API routes (CRUD + admin)
  storage.ts         # DatabaseStorage (IStorage interface)
  db.ts              # Drizzle connection
  seed.ts            # Demo data seeding
  auth/              # Auth module (JWT middleware, user storage)
shared/
  schema.ts          # Drizzle table definitions + Zod insert schemas
  models/auth.ts     # Users table schema
```

### Data Model (Core Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `projects` | User projects | userId (FK), name, summary, dashboardStatus (JSONB) |
| `goal_sections` | Goals page sections | projectId (FK), genericName, completeness, content |
| `lab_buckets` | Lab/knowledge buckets | projectId (FK), name, sortOrder |
| `deliverables` | Deliverables | projectId (FK), title, completeness, status, content |
| `bucket_items` | Attachments/memories | parentId, parentType (goal/lab/deliverable) — polymorphic |
| `chat_messages` | AI conversations | parentId, parentType (7 location types) — polymorphic |
| `core_queries` | AI context prompts | locationKey (7 locations), contextQuery |
| `users` | App users (synced from Supabase Auth) | email, isAdmin, profileImageUrl |

### Design System Rules

- **Fonts**: Inter (sans), Plus Jakarta Sans (headings), JetBrains Mono (mono)
- **Style**: High-density, technical feel with tight radii (2px-8px)
- **Color Palette**: Blue primary (#226-71%-40%), neutral grays
- **Components**: Always use shadcn/ui components from `client/src/components/ui/`. Never hand-roll buttons, inputs, dialogs, dropdowns, etc.
- **Layout**: AppShell provides a 4-panel resizable grid via react-resizable-panels. Pages provide `statusContent`, `chatContent`, and main content to AppShell.
- **Icons**: Lucide React only. No other icon libraries.
- **Toasts**: Sonner only (via the `useToast` hook).

### Known Gotchas — READ BEFORE CODING

1. **Auth is in `server/auth/`** — Use `isAuthenticated` and `isAdmin` from there. JWT verified via Supabase JWT secret.
2. **We use Drizzle ORM, NOT Prisma** — Schema is in `shared/schema.ts`. Migrations via `drizzle-kit push`.
3. **No Redux/Zustand** — State management is React Query for server state + localStorage (`projectStore.ts`) for selected project. Do not introduce a state management library.
4. **All resources are user-scoped** — Every API route must verify `userId` ownership. Use `verifyProjectOwnership()` in routes.
5. **Polymorphic parentType pattern** — `bucket_items` and `chat_messages` use `parentType` to reference different parent tables. Understand this before modifying.
6. **React Query staleTime is Infinity** — Data is manually invalidated, not auto-refetched. After mutations, you MUST invalidate the relevant queries.
7. **AI chat has 7 location types** — `dashboard_page`, `goal_page`, `goal_bucket`, `lab_page`, `lab_bucket`, `deliverable_page`, `deliverable_bucket`. CoreQueries prepend context per location.
8. **First user is auto-admin** — `authStorage.upsertUser()` promotes the first registered user. Do not change this logic without PM approval.
9. **sortOrder is managed by drag-and-drop** — All reorderable items have `sortOrder` integer fields. Reorder endpoints accept arrays of IDs.
10. **No linter or test framework is configured yet** — Only `npm run check` (tsc) exists. Run it before every commit.
11. **Express 5 (not 4)** — Express 5 has different error handling and routing behavior. Check the Express 5 docs, not Stack Overflow answers for Express 4.
12. **Module type is ESM** — `"type": "module"` in package.json. Use `import/export`, not `require/module.exports`. Server builds to CJS for production via esbuild.

### DO NOT List (Anti-Patterns Specific to This Project)

- **DO NOT** install Prisma, Sequelize, or any other ORM — we use Drizzle
- **DO NOT** install Redux, Zustand, MobX, or Jotai — we use React Query + localStorage
- **DO NOT** install Material UI, Chakra, Ant Design, or any other component library — we use shadcn/ui
- **DO NOT** install axios — we use the native fetch wrapper in `lib/queryClient.ts`
- **DO NOT** install Font Awesome or other icon libraries — we use Lucide React
- **DO NOT** create new auth middleware — use `isAuthenticated` / `isAdmin` from the auth module
- **DO NOT** add `console.log` to production code — use structured logging if logging is needed
- **DO NOT** skip `userId` ownership checks on API routes — all data is user-scoped
- **DO NOT** use `as any` or `as unknown as T` — fix the actual types

---

## II) QUICK START

**Quality checks (run frequently):**
```bash
npm run check          # TypeScript type checking (tsc --noEmit)
npm run build          # Full production build (catches additional issues)
```

> **Note:** No linter or test framework is configured yet. When these are added, run them here too.

> ### CRITICAL WORKFLOW RULES
>
> These apply to **every agent, every session**. No exceptions.
>
> 1. **NEVER commit directly to `main`** — use feature branches and PRs
> 2. **Always work on feature branches**: `git checkout -b feature/TICKET-ID-description`
> 3. **Push your branch and create a PR when done**: `git push -u origin feature/... && gh pr create`
> 4. **The PM merges PRs** — you do NOT merge your own
> 5. **One agent per task** — don't work on something another agent is doing

---

## III) ZERO-TOLERANCE RULES

These rules are **non-negotiable**. If any fail, STOP and fix before proceeding.

### TypeScript (Zero Tolerance)

| Rule | WHY |
|------|-----|
| ZERO `any` types | `any` disables type checking. Every `any` is a potential runtime crash hiding in plain sight. |
| ZERO `unknown` workarounds | `as unknown as T` bypasses the type system entirely. Fix the actual types. |
| ZERO `@ts-ignore` without timeline | Suppressing errors hides problems. If you must suppress, document when it will be fixed. |
| ALL functions have return types | Explicit return types catch bugs at compile time, not in production. |
| `strict: true` must stay enabled | tsconfig.json has strict mode on. Never weaken it. |

### Code Quality (Zero Tolerance)

| Rule | WHY |
|------|-----|
| ZERO `console.*` in production code | Use proper logging. Console statements get lost and clutter output. |
| ZERO unused variables / imports | Dead code is confusion waiting to happen. |
| ZERO commented-out code in commits | Use git history, not comments, to preserve old code. |

### Security (Zero Tolerance)

| Rule | WHY |
|------|-----|
| ZERO hardcoded secrets | Secrets in code get committed, pushed, and leaked. Use environment variables. |
| ALL user input validated with Zod | Unvalidated input is an injection attack waiting to happen. Use the Zod schemas from drizzle-zod. |
| ALL SQL through Drizzle ORM | Never write raw SQL. Drizzle handles parameterization. |
| ZERO secrets committed to git | Use `.env` files (gitignored) or secret managers. |
| ALL API routes check userId ownership | Data leaks between users are unacceptable. Every route must verify ownership. |

### Issue Tracking (Zero Tolerance)

| Rule | WHY |
|------|-----|
| NEVER mention a problem without creating an issue | Issues mentioned but not tracked are lost forever. |
| ALL discovered issues get tracked | Untracked problems compound silently until they become emergencies. |

---

## IV) WORKFLOW

### The Flow

```
BACKLOG → READY → IN_PROGRESS → REVIEW → DONE
                       ↓                    ↓
                    BLOCKED      ←←←←←←←←←←
```

### Status Definitions

| Status | Description | WHY This Stage Exists |
|--------|-------------|----------------------|
| **BACKLOG** | Future work, not yet prioritized | Captures ideas without committing resources |
| **READY** | Requirements are clear and development-ready | Prevents wasted work on unclear requirements |
| **IN_PROGRESS** | Agent is actively working | Tracks active work |
| **REVIEW** | Code complete, awaiting review | Code quality gate before merge |
| **BLOCKED** | Stuck — needs PM intervention | Escalation path when agent can't proceed |
| **DONE** | PR merged, deployed | Complete and shipped |

### Git Branch ↔ Workflow Mapping

| Status | Git State |
|--------|-----------|
| IN_PROGRESS | Active work on `feature/TICKET-ID-*` branch |
| REVIEW | PR open, awaiting review |
| DONE | PR merged to `main`, deployed |

---

## V) BEFORE YOU CODE CHECKLIST

**STOP. Read this before starting ANY code work.**

### Decision Tree: Does This Need Tests?

```
Does this change affect code?
├─ NO → Skip tests (docs/config only)
└─ YES → Continue

Does it change business logic, APIs, or data?
├─ NO → Skip tests (formatting/style only)
└─ YES → Tests Required (when test framework is configured)
```

### Pre-Work Steps

1. **Understand the task fully** — read the issue/ticket, ask clarifying questions
2. **Verify system health**
   ```bash
   npm run check  # Must pass before starting
   ```
3. **Sync with git**
   ```bash
   git fetch origin && git pull --rebase origin main
   ```
4. **Create a feature branch**
   ```bash
   git checkout -b feature/TICKET-ID-description
   ```

### Why This Matters

Without this checklist:
- Duplicate work happens (multiple agents on same task)
- Quality gates get skipped
- Tests don't get written
- Work starts on a broken baseline

---

## VI) QUALITY GATES & ENFORCEMENT

### Automated Checks

| Check | Command | What Happens If Failed |
|-------|---------|----------------------|
| Type checking | `npm run check` | Commit blocked — fix type errors |
| Production build | `npm run build` | Deploy blocked — fix build errors |

### Manual Quality Checks

Before any commit:
```bash
npm run check    # TypeScript strict mode
npm run build    # Full build verification
```

### Code Review (Critical)

Every PR must be reviewed for:
- [ ] Code quality and best practices
- [ ] Security vulnerabilities (especially userId ownership checks)
- [ ] Type safety compliance (zero `any`, strict mode)
- [ ] No scope creep
- [ ] **No workarounds** (stubs, mocks, skipped tests)
- [ ] Uses existing patterns (shadcn/ui components, Drizzle ORM, React Query)
- [ ] No new dependencies without PM approval

---

## VII) ANTI-SLOP RULES

### The Surgical Fix Principle

**The size of a fix must be proportional to the problem.**

| Problem Type | Expected Scope | Red Flag |
|--------------|---------------|----------|
| Bug in one function | 1-10 lines, 1-2 files | Touching 3+ files |
| Type error | That file only | Refactoring neighbors |
| Feature addition | Specified scope only | "Improving" existing code |

**WHY?** Large fixes hide bugs. Small, focused changes are reviewable.

### The Adjacent Code Rule

When fixing a bug:
- DO: Fix the specific broken behavior
- DON'T: Refactor the surrounding function "while you're there"
- DON'T: Update related code that "could also use improvement"
- DON'T: Add TypeScript annotations to functions you didn't modify

**WHY?** Scope creep introduces new bugs and makes review impossible.

### The "While I'm Here" Protocol

If you discover ANY issue while working:

1. **STOP** — Don't fix it in the same commit
2. **CREATE AN ISSUE** — File it in your issue tracker with enough context to reproduce
3. **REPORT IT** — Mention the issue ID in your response
4. Continue with original task

**Violation examples (ALL are violations):**
- "I noticed X is broken" without creating an issue
- "I found 24 TypeScript errors but they're not related to my work, moving on"
- "There are several issues in this file but they're out of scope"
- "I see some problems but I'll leave them for now"

**WHY?** Issues mentioned but not tracked are lost forever. Observing a problem and walking away is worse than not noticing it.

---

## VIII) NO WORKAROUNDS POLICY

### The Prime Directive

**ALWAYS fix the underlying issue. Never work around it.**

A workaround is any change that makes code compile, tests pass, or errors disappear WITHOUT fixing the actual problem.

### Forbidden Patterns

| Pattern | Why It's Forbidden | What To Do Instead |
|---------|-------------------|-------------------|
| `as unknown as T` | Bypasses type system entirely | Fix the actual types |
| `as any` | Disables all type checking | Define proper types |
| `@ts-ignore` without timeline | Hides errors forever | Document when it will be fixed |
| `test.skip()` | Tests exist for a reason | Fix the test or the code |
| Mocking YOUR OWN code | Masks broken implementations | Fix the code being mocked |
| "Graceful degradation" stubs | Masks configuration issues | Fix the config |
| Fallback values hiding missing env vars | Delays failure to production | Fail fast instead |
| Catching errors and silently swallowing | Hides bugs in production | Log errors, surface to user |
| Adding `!` (non-null assertion) everywhere | Pretends null doesn't exist | Handle the null case properly |

### When Something Fails

The correct response is **NEVER** to:
- Skip the failing code
- Mock the broken dependency
- Delete the test
- Mark it as "known failure"
- Wrap it in a try/catch that swallows the error

The correct response is:
1. Understand WHY it's failing
2. Fix the CODE if the expectation is correct
3. Fix the EXPECTATION if the code is correct
4. If you can't fix it, STOP and ask for help

**WHY?** Workarounds compound. Today's "temporary fix" becomes next month's production outage.

---

## IX) COGNITIVE GUARDRAILS

### Rabbit Hole Detection

Warning signs:
- Spending >20% effort on <5% of value
- Adding complexity for rare edge cases
- Optimizing before measuring
- Going down a path that "feels wrong"
- Installing a new dependency for something that could be 10 lines of code

**When detected:** STOP → Step back → Restate goal in one sentence → Ask "Is what I'm doing serving this goal?"

### Uncertainty Protocol

| Confidence | Action |
|------------|--------|
| High | Proceed, note assumptions |
| Moderate | State interpretation, verify if important |
| Low | Propose approach, request validation |
| Uncertain | STOP, ask clarifying questions |

**"I don't know" is always acceptable. Guessing is not.**

### Terminal Success ≠ Reality

| What Passes | What It Proves | What It DOESN'T Prove |
|-------------|----------------|----------------------|
| `npm run check` passes | No compile errors | Bug is fixed |
| Server starts | Code runs | Feature functions correctly |
| API returns 200 | Endpoint responds | Data is correct |
| UI renders | Component mounts | User workflow works |

**A fix is NOT done until it's VERIFIED, not just coded.**

---

## X) PM GOVERNANCE

### Requires PM Approval

- Constitution changes
- Architecture changes (new libraries, new patterns, new services)
- Bug fix touching >5 files
- New abstractions or services
- Workaround exceptions
- Changes to deployment configuration (vercel.json, build scripts)
- Database schema changes (new tables, column modifications)
- New npm dependencies

### Escalation Triggers

| Trigger | Action |
|---------|--------|
| Task is blocked | PM notified |
| Review fails 3+ times | PM intervention |
| Security issue found | Immediate PM notification |
| Repeated workarounds in session | PM notification |
| Auth system changes needed | PM approval required |

---

## XI) SESSION PROTOCOL

### Starting a Session

1. Read this constitution
2. Read `replit.md` (project state) for latest project state and recent changes
3. Check for any in-progress work from prior sessions
4. Sync with git: `git fetch origin && git pull --rebase origin main`
5. Run quality checks to verify clean baseline: `npm run check`

### During Work

```bash
# Run frequently
npm run check
```

### Ending a Session

Before ending any session:
1. Commit and push all work in progress
2. Update issue/task status
3. Leave a note on any open PRs about current state
4. Ensure no uncommitted changes are left behind

**WHY?** The next agent (or human) needs clean state to continue.

---

## XII) SUCCESS CHECKLIST

Before marking work complete:

- [ ] Did I fix only what was asked?
- [ ] Did I avoid touching unrelated code?
- [ ] Do all zero-tolerance rules pass?
- [ ] Does `npm run check` pass?
- [ ] Can I explain my change in one sentence?
- [ ] Is my change proportional to the problem?
- [ ] Did I fix the ACTUAL problem (not work around it)?
- [ ] Are there any `as any`, `@ts-ignore`, or `!` assertions hiding issues?
- [ ] Did I use existing patterns (shadcn/ui, Drizzle, React Query)?
- [ ] Did I verify userId ownership on any new/modified API routes?
- [ ] Would this code embarrass me in a code review?
- [ ] Did I create issues for any problems I discovered but didn't fix?

---

## Completing Work: Step-by-Step

### Stage 1: Code Complete → Create PR

```bash
# 1. Run quality checks
npm run check && npm run build

# 2. Commit to your FEATURE BRANCH (never main)
git add <files>
git commit -m "[TICKET-ID] description"

# 3. Push branch and create PR
git push -u origin feature/TICKET-ID-description
gh pr create --title "[TICKET-ID] description" --body "Summary of changes"
```

### Stage 2: Review

PR is reviewed for quality, security, and correctness. Fix any issues and push updates.

### Stage 3: Done

After PM merges the PR, the work is complete.

### If Something Fails

| Stage | If Fails | Action |
|-------|----------|--------|
| Build | Type errors or build failure | Fix on branch → push → re-check |
| Review | Issues found | Fix code, push, re-request review |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-02-19 | Initial constitution customized for AgilityAI |
