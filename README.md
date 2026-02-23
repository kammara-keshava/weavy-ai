# Weavy AI Workflow Builder

A pixel-perfect UI/UX clone of workflow builder, focused exclusively on LLM (Large Language Model) workflows.

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** (strict mode)
- **React Flow** for visual workflow canvas
- **Clerk** for authentication
- **PostgreSQL** with Prisma ORM
- **Trigger.dev** for node execution
- **Google Gemini API** for LLM execution
- **Transloadit** for file uploads
- **FFmpeg** for image/video processing
- **Tailwind CSS** for styling
- **Zustand** for state management

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `TRIGGER_API_KEY`
- `TRIGGER_API_URL`
- `GOOGLE_AI_API_KEY`
- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`
