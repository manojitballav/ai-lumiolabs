# Lumio Labs - AI Project Hosting Platform

## Overview

Internal platform for Circuit House Technologies to host AI projects as subdomains on `lumiolabs.in`.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js with Google OAuth (restricted to @circuithouse.tech)
- **Database**: PostgreSQL with Prisma ORM
- **Deployment Target**: GCP with Docker + Traefik

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Public landing page
│   ├── layout.tsx            # Root layout with providers
│   ├── dashboard/
│   │   └── page.tsx          # Authenticated project directory
│   ├── projects/
│   │   └── [id]/
│   │       └── page.tsx      # Project details page
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts  # NextAuth API routes
│       └── projects/
│           ├── route.ts      # GET all, POST new project
│           └── [id]/
│               └── route.ts  # GET, PATCH, DELETE project
├── components/
│   ├── Header.tsx            # Navigation with auth
│   ├── Providers.tsx         # Session provider wrapper
│   ├── ProjectCard.tsx       # Project display card
│   ├── DashboardContent.tsx  # Dashboard with modal state
│   ├── AddProjectModal.tsx   # Create project form
│   ├── ProjectDetails.tsx    # Project detail view with edit
│   └── EnvVarsEditor.tsx     # Environment variables editor
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   └── prisma.ts             # Prisma client singleton
└── types/
    └── next-auth.d.ts        # NextAuth type extensions
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Database Commands

```bash
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema to database
npx prisma migrate dev  # Create and apply migrations
npx prisma studio       # Open Prisma Studio GUI
```

## Environment Variables

Required in `.env.local`:

```env
GOOGLE_CLIENT_ID=        # From Google Cloud Console
GOOGLE_CLIENT_SECRET=    # From Google Cloud Console
NEXTAUTH_SECRET=         # Random secret (openssl rand -base64 32)
NEXTAUTH_URL=            # http://localhost:3000 or https://lumiolabs.in
ALLOWED_DOMAIN=          # circuithouse.tech
DATABASE_URL=            # PostgreSQL connection string
```

## Authentication

- Only `@circuithouse.tech` Google accounts can sign in
- Public visitors see landing page with access restriction notice
- Authenticated users redirected to /dashboard

## Domain Configuration

- Root: `https://lumiolabs.in` - Main directory
- Projects: `https://[project-name].lumiolabs.in`

DNS Records needed:
- A record: `@` → Server IP
- A record: `*` → Server IP (wildcard)
- CNAME: `www` → `lumiolabs.in`

## Current Status

**Phase 1 Complete:**
- Public landing page with access restriction notice
- Google OAuth restricted to @circuithouse.tech
- Dashboard with project directory
- Project card component

**Phase 2 Complete:**
- Add Project modal with form validation
- Project CRUD API routes (GET, POST, PATCH, DELETE)
- Project details page with inline editing
- Delete project with confirmation
- Environment variables editor with show/hide values
- Owner-only edit/delete permissions

**Phase 3 (Next):**
- Git-based deployment pipeline
- Docker container orchestration
- Subdomain routing with Traefik
- Automatic builds on push
