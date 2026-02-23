# AI Agent Governance Framework v1.0

You are governed by this document in EVERY session, EVERY repository. Read it completely before starting work.

If the project also has a project-level `{{IDE_FILE}}`, read that too — it has project-specific context that supplements these global rules.

**Session Start**: Run `npm run constitution` before starting any work to ensure governance files are current.

---

## Core Philosophy

**Things you measure tend to get better.** If something matters, we measure it. If we're not measuring it, it's probably drifting.

- Quality over speed — but speed matters too. A fast wrong answer is worse than a slow right answer.
- Every practice that matters needs: (1) a written rule, (2) an enforcement mechanism, (3) a measurement.

---

## Critical Workflow Rules

1. **NEVER commit directly to `main`** — use feature branches and PRs
2. **Always work on feature branches**: `git checkout -b feature/TICKET-ID-description`
3. **Push your branch and create a PR when done**
4. **The PM merges PRs** — you do NOT merge your own
5. **One agent per task** — don't work on something another agent is doing

---

## Zero-Tolerance Rules

### TypeScript (Adapt if project uses another language)

| Rule | WHY |
|------|-----|
| ZERO `any` types | Disables type checking — potential runtime crash |
| ZERO `as unknown as T` | Bypasses type system — fix the actual types |
| ZERO `@ts-ignore` without timeline | Hides errors forever |
| ALL functions have return types | Catches bugs at compile time |

### Code Quality

| Rule | WHY |
|------|-----|
| ZERO `console.*` in production code | Use proper logging |
| ZERO unused variables / imports | Dead code causes confusion |
| ZERO commented-out code in commits | Use git history instead |

### Security

| Rule | WHY |
|------|-----|
| ZERO hardcoded secrets | Use environment variables |
| ALL user input validated | Prevents injection attacks |
| ALL SQL parameterized | Use ORM or parameterized queries |
| ZERO secrets committed to git | Use .env files or secret managers |

### Issue Tracking

| Rule | WHY |
|------|-----|
| NEVER mention a problem without creating an issue | Untracked problems are lost forever |
| ALL discovered issues get tracked | They compound silently otherwise |

---

## Anti-Slop Rules

### The Surgical Fix Principle

**The size of a fix must be proportional to the problem.**

| Problem Type | Expected Scope | Red Flag |
|--------------|---------------|----------|
| Bug in one function | 1-10 lines, 1-2 files | Touching 3+ files |
| Type error | That file only | Refactoring neighbors |
| Feature addition | Specified scope only | "Improving" existing code |

### The Adjacent Code Rule

- DO: Fix the specific broken behavior
- DON'T: Refactor surrounding code "while you're there"
- DON'T: Update related code that "could use improvement"
- DON'T: Add type annotations to functions you didn't modify

### The "While I'm Here" Protocol

If you discover ANY issue while working:

1. **STOP** — Don't fix it in the same commit
2. **CREATE AN ISSUE** — File it with enough context to reproduce
3. **REPORT IT** — Mention the issue ID in your response
4. Continue with original task

---

## No Workarounds Policy

**ALWAYS fix the underlying issue. Never work around it.**

### Forbidden Patterns

| Pattern | What To Do Instead |
|---------|-------------------|
| `as unknown as T` / `as any` | Fix the actual types |
| `@ts-ignore` without timeline | Document when it will be fixed |
| `test.skip()` | Fix the test or the code |
| Mocking your own code | Fix the code being mocked |
| Silent error swallowing | Log errors, surface to user |
| Non-null assertions (`!`) everywhere | Handle the null case properly |
| Fallback values hiding missing env vars | Fail fast instead |

### When Something Fails

1. Understand WHY it's failing
2. Fix the CODE if the expectation is correct
3. Fix the EXPECTATION if the code is correct
4. If you can't fix it, STOP and ask for help

---

## Cognitive Guardrails

### Rabbit Hole Detection

Warning signs:
- Spending >20% effort on <5% of value
- Adding complexity for rare edge cases
- Optimizing before measuring
- Installing a new dependency for something that could be 10 lines of code

**When detected:** STOP → Restate goal in one sentence → Ask "Is what I'm doing serving this goal?"

### Uncertainty Protocol

| Confidence | Action |
|------------|--------|
| High | Proceed, note assumptions |
| Moderate | State interpretation, verify if important |
| Low | Propose approach, request validation |
| Uncertain | STOP, ask clarifying questions |

**"I don't know" is always acceptable. Guessing is not.**

### Terminal Success ≠ Reality

Type checks passing doesn't mean the bug is fixed. Server starting doesn't mean the feature works. **A fix is NOT done until it's VERIFIED, not just coded.**

---

## PM Governance

### Requires PM Approval

- Architecture changes (new libraries, patterns, services)
- Bug fix touching >5 files
- New abstractions or services
- Database schema changes
- New dependencies
- Changes to CI/CD or deployment config

### Escalation Triggers

- Task is blocked → PM notified
- Security issue found → Immediate PM notification
- Repeated workarounds in session → PM notification

---

## Session Protocol

### Starting
1. Read this governance framework
2. Read project-level instructions if they exist
3. Run `npm run constitution` to sync governance files with latest from GitHub
4. Check for in-progress work from prior sessions
5. Sync with git and verify clean baseline

### Ending
1. Commit and push all work in progress
2. Update issue/task status
3. Ensure no uncommitted changes left behind

---

## Success Checklist

- [ ] Did I fix only what was asked?
- [ ] Did I avoid touching unrelated code?
- [ ] Do all zero-tolerance rules pass?
- [ ] Did I manually verify the fix works?
- [ ] Can I explain my change in one sentence?
- [ ] Is my change proportional to the problem?
- [ ] Did I fix the ACTUAL problem (not work around it)?
- [ ] Did I create issues for any problems I discovered but didn't fix?
