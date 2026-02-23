# AgilityAI — Project Context

Read the global governance framework in `~/.gemini/GEMINI.md` first. This file provides AgilityAI-specific context.

Also read `CONSTITUTION.md` in this repo for the full combined reference.

---

## What Is AgilityAI?

An AI-powered decision-making and project management tool. Users break down projects into goals, research knowledge, and deliverables — with AI chat assistants embedded at every level.

Four main sections:
- **Dashboard** — Project status overview with AI chat
- **Goals** — Goal sections (Context, Objective, Stakeholders, Constraints) with completeness tracking
- **Lab** — Knowledge buckets (Sources, Open Questions, etc.) for research
- **Deliverables** — Trackable deliverables with status, completeness, and content

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 7, wouter routing |
| UI | shadcn/ui (New York) + Radix UI + Tailwind v4 |
| Data Fetching | @tanstack/react-query (staleTime: Infinity, manual invalidation) |
| Animations | Framer Motion |
| Drag & Drop | @dnd-kit |
| Forms | React Hook Form + Zod resolvers |
| Backend | Express 5 + TypeScript, Node 20 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Replit OIDC + Passport.js (first user auto-admin) |
| Deployment | Replit (esbuild → dist/index.cjs) |
| Package Manager | npm |

## Key Directories

```
client/src/
  pages/             # 16 page components
  components/
    layout/          # AppShell (4-panel resizable grid), Header
    shared/          # ChatWorkspace, SummaryCard, ScopedHistory
    ui/              # 57+ shadcn/ui components — DO NOT hand-roll
  hooks/             # use-auth, use-core-queries, use-mobile, use-toast
  lib/               # api.ts, queryClient.ts, projectStore.ts, utils.ts, types.ts
server/
  index.ts           # Express setup + middleware
  routes.ts          # All API routes
  storage.ts         # DatabaseStorage (IStorage interface)
  db.ts              # Drizzle connection
  seed.ts            # Demo data seeding
  replit_integrations/auth/  # Auth module — DO NOT create a second one
shared/
  schema.ts          # Drizzle table definitions + Zod schemas
  models/auth.ts     # Users and sessions tables
```

## Quality Checks

```bash
npm run check    # TypeScript (tsc --noEmit)
npm run build    # Full production build
```

No linter or test framework configured yet.

## Known Gotchas

1. **Auth is in `server/replit_integrations/auth/`** — Use `isAuthenticated` and `isAdmin` from there
2. **Drizzle ORM, NOT Prisma** — Schema in `shared/schema.ts`, migrations via `drizzle-kit push`
3. **No Redux/Zustand** — React Query for server state + localStorage (`projectStore.ts`) for selected project
4. **All resources are user-scoped** — Every route must verify `userId` ownership via `verifyProjectOwnership()`
5. **Polymorphic parentType** — `bucket_items` and `chat_messages` use `parentType` for different parent tables
6. **React Query staleTime is Infinity** — After mutations, you MUST invalidate relevant queries
7. **7 AI chat locations** — dashboard_page, goal_page, goal_bucket, lab_page, lab_bucket, deliverable_page, deliverable_bucket
8. **First user is auto-admin** — Don't change this logic without PM approval
9. **sortOrder managed by drag-and-drop** — Reorder endpoints accept arrays of IDs
10. **Express 5 (not 4)** — Different error handling and routing behavior
11. **ESM module type** — Use `import/export`, builds to CJS for production via esbuild

## Design System

- **Fonts**: Inter (sans), Plus Jakarta Sans (headings), JetBrains Mono (mono)
- **Style**: High-density, technical feel, tight radii (2px-8px)
- **Colors**: Blue primary, neutral grays
- **Components**: ALWAYS use shadcn/ui from `client/src/components/ui/`
- **Icons**: Lucide React only
- **Toasts**: Sonner only
- **Layout**: AppShell 4-panel resizable grid via react-resizable-panels

## DO NOT

- Install Prisma, Sequelize, or any other ORM
- Install Redux, Zustand, MobX, or Jotai
- Install Material UI, Chakra, Ant Design, or any other component library
- Install axios (use native fetch wrapper in `lib/queryClient.ts`)
- Install Font Awesome or other icon libraries
- Create new auth middleware (use existing auth module)
- Add `console.log` to production code
- Skip `userId` ownership checks on API routes
- Use `as any` or `as unknown as T`
