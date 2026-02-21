# AgilityAI — Decision-Making & Project Management Tool

## Overview
A decision-making and project management tool with four main sections: Dashboard, Brief, Discovery/Knowledge Buckets, and Deliverables. Projects are selected via a header dropdown and switching projects updates all pages. Supports two levels of AI chat: global page-level and bucket-scoped conversations. Features user authentication via Replit Auth (OIDC) with admin and regular user roles.

## Architecture
- **Frontend**: React + Vite + TypeScript, Tailwind CSS + shadcn/ui, wouter routing, @tanstack/react-query for data fetching
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OIDC) with passport, express-session, connect-pg-simple for session storage
- **Data Flow**: Frontend fetches via React Query → Express API routes (protected by isAuthenticated middleware) → Drizzle storage layer → PostgreSQL

## Database Schema
- `users` — id, email, firstName, lastName, profileImageUrl, isAdmin, createdAt, updatedAt (Replit Auth managed)
- `sessions` — sid, sess (jsonb), expire (Replit Auth session storage)
- `projects` — id, userId (FK to users), name, summary, executiveSummary, dashboardStatus (jsonb), createdAt
- `goal_sections` — id, projectId (FK), genericName, subtitle, completeness, totalItems, completedItems, content, sortOrder
- `lab_buckets` — id, projectId (FK), name, sortOrder
- `deliverables` — id, projectId (FK), title, subtitle, completeness, status, content, engaged, sortOrder
- `bucket_items` — id, parentId, parentType (goal/lab/deliverable), type, title, preview, date, url, fileName, fileSizeLabel, sortOrder
- `chat_messages` — id, parentId, parentType (goal_page/lab_page/deliverable_page/goal_bucket/lab_bucket/deliverable_bucket), role, content, timestamp, hasSaveableContent, saved, sortOrder

## Auth System
- Replit Auth (OIDC) handles login/signup via /api/login and /api/logout
- First user to register automatically becomes admin
- Admin users can access /admin dashboard to manage users and view all projects
- All API routes protected with isAuthenticated middleware
- Admin routes additionally protected with isAdmin middleware
- Projects are scoped per user (each user sees only their own projects)
- Session stored in PostgreSQL via connect-pg-simple

## Key Files
- `shared/schema.ts` — Drizzle schema definitions + Zod insert schemas (re-exports auth models)
- `shared/models/auth.ts` — Users and sessions table schemas
- `server/db.ts` — Database connection
- `server/storage.ts` — Storage interface (IStorage) + DatabaseStorage implementation
- `server/routes.ts` — Express API routes (protected)
- `server/seed.ts` — Demo data seeding (auto-seeds on first request per user)
- `server/replit_integrations/auth/` — Auth module (setupAuth, isAuthenticated, authStorage, routes)
- `client/src/hooks/use-auth.ts` — React hook for authentication state
- `client/src/lib/auth-utils.ts` — Auth error handling utilities
- `client/src/lib/api.ts` — Frontend API client
- `client/src/lib/projectStore.ts` — Selected project state (localStorage for quick access)
- `client/src/lib/queryClient.ts` — React Query client + apiRequest helper
- `client/src/pages/LandingPage.tsx` — Public landing page for unauthenticated users
- `client/src/pages/AdminPage.tsx` — Admin dashboard (users, projects, stats)

## Recent Changes (Feb 18, 2026)
- Reorganized Goals, Lab, Deliverables layout: status card moved to top-left (with scroll overflow), AI chat takes larger top-right, navigation moved to bottom-left beside buckets
- AppShell now accepts `statusContent` and `chatContent` props (replaced `topRightContent`)
- Layout: top row = status (25%) + chat (75%), bottom row = nav (18%) + buckets (82%), all resizable
- Added Dashboard AI chat with ChatWorkspace, message persistence (parentType: dashboard_page), and core query prepending
- Dashboard redesigned with horizontal resizable split: left (status + executive summary), right (AI chat)
- Added dashboard_page location to CoreQs admin page (7 total locations now)
- Location keys: dashboard_page, goal_page, goal_bucket, lab_page, lab_bucket, deliverable_page, deliverable_bucket

## Previous Changes (Feb 17, 2026)
- Added CoreQs admin page (/admin/coreqs) for managing AI context queries
- `core_queries` table stores context queries per AI interaction location (6 locations)
- Location keys: goal_page, goal_bucket, lab_page, lab_bucket, deliverable_page, deliverable_bucket
- Admin can set context queries that get prepended to user messages at each AI interaction point
- API: GET /api/core-queries (all users), GET/PUT /api/admin/core-queries (admin only)
- CoreQs menu item added to admin section of Header user dropdown

## Previous Changes (Feb 14, 2026)
- Added Replit Auth integration (OIDC) with user authentication
- Added admin role system (first user auto-promoted to admin)
- Added userId to projects table for per-user project isolation
- Created landing page for unauthenticated visitors
- Created admin dashboard with user management, project overview, and usage stats
- Protected all API routes with authentication middleware
- Updated Header to show real user info (name, avatar, profile image) with working logout
- Added admin-only menu item in Header user dropdown

## User Preferences
- Clean, minimal UI with consistent bucket patterns across pages
- Two-level chat: global page-level + bucket-scoped
- Drag-and-drop reordering for sections/buckets/deliverables
- Memory/attachments panel in expandable buckets
- History sidebar (ScopedHistory component)
