# AgilityAI — Decision-Making & Project Management Tool

> **AI Agents**: Read `CONSTITUTION.md` for the full governance framework (anti-slop rules, no workarounds policy, cognitive guardrails, zero-tolerance rules, session protocol). It is the single source of truth for how you work.

## Overview
A decision-making and project management tool with four main sections: Dashboard, Brief, Discovery, and Deliverables. Projects are selected via a header dropdown and switching projects updates all pages. Supports two levels of AI chat: global page-level and scoped conversations (section-level, category-level, or asset-level). Features user authentication via Supabase Auth with JWT tokens, admin and regular user roles.

## Architecture
- **Frontend**: React + Vite + TypeScript, Tailwind CSS + shadcn/ui, wouter routing, @tanstack/react-query for data fetching
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Supabase Auth — frontend gets JWT via @supabase/supabase-js, backend verifies JWT with jsonwebtoken
- **Data Flow**: Frontend fetches via React Query → Express API routes (protected by isAuthenticated middleware) → Drizzle storage layer → PostgreSQL

## Page-Specific Terminology
- **Brief**: expandable areas called "Sections" (e.g., Context, Objective, Stakeholders, Constraints)
- **Discovery**: expandable areas called "Categories" (e.g., Market Research, Team Preferences)
- **Deliverables**: expandable areas called "Assets" (e.g., Decision Memo, Analysis Deck)

## Database Schema
- `users` — id, email, firstName, lastName, profileImageUrl, isAdmin, createdAt, updatedAt (synced from Supabase Auth)
- `projects` — id, userId (FK to users), name, summary, executiveSummary, dashboardStatus (jsonb), createdAt
- `brief_sections` — id, projectId (FK), genericName, subtitle, completeness, totalItems, completedItems, content, sortOrder
- `discovery_categories` — id, projectId (FK), name, sortOrder
- `deliverables` — id, projectId (FK), title, subtitle, completeness, status, content, engaged, sortOrder
- `bucket_items` — id, parentId, parentType (brief/discovery/deliverable), type, title, preview, date, url, fileName, fileSizeLabel, sortOrder
- `chat_messages` — id, parentId, parentType (brief_page/discovery_page/deliverable_page/brief_section/discovery_category/deliverable_asset/dashboard_page), role, content, timestamp, hasSaveableContent, saved, sortOrder

## Auth System
- Supabase Auth handles login/signup on the frontend via @supabase/supabase-js
- Frontend sends JWT as `Authorization: Bearer <token>` header on all API requests
- Backend verifies JWT using SUPABASE_JWT_SECRET via jsonwebtoken
- POST /api/auth/sync upserts user record after Supabase login
- First user to register automatically becomes admin
- Admin users can access /admin dashboard to manage users and view all projects
- All API routes protected with isAuthenticated middleware (JWT verification)
- Admin routes additionally protected with isAdmin middleware
- Projects are scoped per user (each user sees only their own projects)
- Stateless auth — no server-side sessions

## Key Files
- `shared/schema.ts` — Drizzle schema definitions + Zod insert schemas (re-exports auth models)
- `shared/models/auth.ts` — Users table schema
- `server/db.ts` — Database connection
- `server/storage.ts` — Storage interface (IStorage) + DatabaseStorage implementation
- `server/routes.ts` — Express API routes (protected)
- `server/seed.ts` — Demo data seeding (auto-seeds on first request per user)
- `server/auth/` — Auth module (isAuthenticated JWT middleware, isAdmin, authStorage)
- `client/src/hooks/use-auth.ts` — React hook for authentication state
- `client/src/lib/auth-utils.ts` — Auth error handling utilities
- `client/src/lib/api.ts` — Frontend API client
- `client/src/lib/projectStore.ts` — Selected project state (localStorage for quick access)
- `client/src/lib/queryClient.ts` — React Query client + apiRequest helper
- `client/src/pages/LandingPage.tsx` — Public landing page for unauthenticated users
- `client/src/pages/BriefPage.tsx` — Brief page (sections)
- `client/src/pages/DiscoveryPage.tsx` — Discovery page (categories)
- `client/src/pages/DeliverablesPage.tsx` — Deliverables page (assets)
- `client/src/pages/AdminPage.tsx` — Admin dashboard (users, projects, stats)
- `client/src/pages/CoreQsPage.tsx` — CoreQs admin page for AI context queries

## Recent Changes (Feb 21, 2026)
- Renamed expandable area concepts to page-specific names: Sections (Brief), Categories (Discovery), Assets (Deliverables)
- Database table: discovery_buckets → discovery_categories
- parentType values updated: brief_bucket → brief_section, discovery_bucket → discovery_category, deliverable_bucket → deliverable_asset
- Location keys: brief_page, brief_section, discovery_page, discovery_category, deliverable_page, deliverable_asset, dashboard_page
- Internal code: DiscoveryBucket type → DiscoveryCategory, all bucket variables/functions renamed to section/category/asset per page
- UI labels: "Knowledge Buckets" → "Categories", nav titles updated to Sections/Categories/Assets
- CoreQs labels updated: "Bucket-Level AI" → "Section-Level AI" / "Category-Level AI" / "Asset-Level AI"
- Previously: Renamed "Goals" to "Brief" and "Lab" to "Discovery" everywhere

## Previous Changes (Feb 18, 2026)
- Reorganized Brief, Discovery, Deliverables layout: status card moved to top-left (with scroll overflow), AI chat takes larger top-right, navigation moved to bottom-left beside content
- AppShell now accepts `statusContent` and `chatContent` props (replaced `topRightContent`)
- Layout: top row = status (25%) + chat (75%), bottom row = nav (18%) + content (82%), all resizable
- Added Dashboard AI chat with ChatWorkspace, message persistence (parentType: dashboard_page), and core query prepending
- Dashboard redesigned with horizontal resizable split: left (status + executive summary), right (AI chat)
- Added dashboard_page location to CoreQs admin page (7 total locations now)

## Previous Changes (Feb 17, 2026)
- Added CoreQs admin page (/admin/coreqs) for managing AI context queries
- `core_queries` table stores context queries per AI interaction location
- Location keys: brief_page, brief_section, discovery_page, discovery_category, deliverable_page, deliverable_asset
- Admin can set context queries that get prepended to user messages at each AI interaction point
- API: GET /api/core-queries (all users), GET/PUT /api/admin/core-queries (admin only)
- CoreQs menu item added to admin section of Header user dropdown

## Previous Changes (Feb 14, 2026)
- Added user authentication (originally Replit OIDC, migrated to Supabase Auth)
- Added admin role system (first user auto-promoted to admin)
- Added userId to projects table for per-user project isolation
- Created landing page for unauthenticated visitors
- Created admin dashboard with user management, project overview, and usage stats
- Protected all API routes with authentication middleware
- Updated Header to show real user info (name, avatar, profile image) with working logout
- Added admin-only menu item in Header user dropdown

## User Preferences
- Clean, minimal UI with consistent patterns across pages
- Two-level chat: global page-level + scoped (section/category/asset-level)
- Drag-and-drop reordering for sections/categories/assets
- Memory/attachments panel in expandable areas
- History sidebar (ScopedHistory component)
