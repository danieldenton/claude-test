# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run Vitest unit tests
npm run setup        # Install deps + generate Prisma client + run migrations
npm run db:reset     # Reset SQLite database
```

## Environment Variables

- `ANTHROPIC_API_KEY` — optional; falls back to `MockLanguageModel` if absent
- `JWT_SECRET` — defaults to a dev key if unset

## Architecture

UIGen is an AI-powered React component generator. Users describe components in natural language; Claude generates them into a virtual file system with live preview.

### Virtual File System

`src/lib/file-system.ts` implements an in-memory VFS — no disk writes. Files are serialized to JSON for persistence in the Prisma `Project.data` column. The VFS is shared between the frontend (via `FileSystemContext`) and the chat API route (reconstructed per request).

### AI Code Generation

`src/app/api/chat/route.ts` streams responses using Vercel AI SDK. Claude uses two tools to write code:
- `str_replace_editor` — create/str_replace/insert operations on virtual files
- `file_manager` — rename/delete operations

The system prompt (in `src/lib/prompts/`) instructs Claude to always create `/App.jsx` as the entry point and use Tailwind CSS with `@/` import aliases.

### Live Preview

`src/components/preview/PreviewFrame.tsx` renders generated code in a sandboxed iframe. JSX is transformed in-browser using `@babel/standalone`. Dynamic import maps resolve `@/` aliases to Blob URLs created from virtual file contents.

### State Management

- `FileSystemContext` — virtual FS state + file CRUD operations
- `ChatContext` — wraps Vercel AI SDK's `useChat`, handles tool calls, tracks anonymous work to `sessionStorage`

### Authentication

JWT sessions stored in HTTP-only cookies (7-day expiry). `src/lib/auth.ts` handles token creation/verification. `src/middleware.ts` verifies sessions on requests. Server actions in `src/actions/` handle signUp/signIn/signOut.

Anonymous users get full functionality; their work is saved to `sessionStorage` and can be persisted to the DB after sign-in.

### Layout

Three-panel `ResizablePanelGroup`: Chat | Preview (iframe) or Code Editor (FileTree + Monaco). Panels are user-resizable.

### Database

Prisma 6 with SQLite (`prisma/dev.db`). Schema: `User` (id, email, hashed password) and `Project` (name, userId, messages JSON, data JSON for serialized VFS). Projects are deleted on user delete (cascade).

### Testing

Tests colocate with source in `__tests__/` subdirectories. Uses Vitest + jsdom + `@testing-library/react`.

## Code Style

Use comments sparingly — only in complex or non-obvious code.
