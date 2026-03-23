# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
# First-time setup (installs deps, generates Prisma client, runs migrations)
npm run setup

# Development server (localhost:3000)
npm run dev

# Development server in background
npm run dev:daemon

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Reset database
npm run db:reset
```

The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already set in npm scripts) for Next.js + Turbopack to work with the Prisma client.

## Code Conventions

- Path alias `@/*` maps to `src/*` — use it for all internal imports.
- Tests are colocated in `__tests__/` subdirectories next to the code they test. Vitest runs with a jsdom environment.

## Architecture

### Overview

UIGen is an AI-powered React component generator. Users describe a component in chat, and the AI writes files into an in-memory **Virtual File System (VFS)**. A live preview renders those files in the browser using Babel + ES module import maps. No files are written to disk during generation.

### Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is the core data structure — an in-memory tree of `FileNode` objects. It supports standard FS operations plus text editor operations (`viewFile`, `replaceInFile`, `insertInFile`) used by AI tools. It serializes to/from plain JSON for persistence and network transfer.

### System Prompt (`src/lib/prompts/generation.tsx`)

Contains the system prompt that instructs the AI on how to generate React components. Edit this to change AI behavior or tool usage guidance.

### AI Tools (`src/lib/tools/`)

The API route (`src/app/api/chat/route.ts`) exposes two tools to the AI via Vercel AI SDK's `streamText`:

- **`str_replace_editor`** — create, str_replace, insert, view operations on VFS files
- **`file_manager`** — rename and delete operations on VFS files

When the AI calls a tool, the response streams to the client. `FileSystemContext.handleToolCall` intercepts tool calls on the client and applies them to the local VFS instance, triggering re-renders.

### Client State: Context Providers

- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — owns the VFS instance and exposes mutation methods. `handleToolCall` is the bridge between AI tool calls and local state.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, passing the serialized VFS as the request body on every message so the server can reconstruct state.

### Preview Pipeline (`src/lib/transform/jsx-transformer.ts`)

1. Each JS/JSX/TS/TSX file in the VFS is transformed via `@babel/standalone`
2. Transformed code becomes Blob URLs
3. An ES module import map is generated (React from esm.sh, third-party packages resolved to esm.sh, local files to blob URLs)
4. An HTML document is generated with the import map and a `<script type="module">` that imports `/App.jsx` as the entry point
5. This HTML renders inside `PreviewFrame`'s `<iframe>`

### AI Provider (`src/lib/provider.ts`)

`getLanguageModel()` returns either:
- **Real model**: `claude-haiku-4-5` via `@ai-sdk/anthropic` when `ANTHROPIC_API_KEY` is set
- **`MockLanguageModel`**: a local `LanguageModelV1` implementation that streams static component code with no API call, used when no API key is present

### Authentication (`src/lib/auth.ts`)

JWT-based auth using `jose`. Sessions stored as `httpOnly` cookies (7-day expiry). Passwords hashed with `bcrypt`. Module is marked `server-only`. Middleware protects `/api/projects` and `/api/filesystem`. Anonymous users can use the app; work is tracked in localStorage via `src/lib/anon-work-tracker.ts` and can be claimed after sign-up.

### Database

Prisma with SQLite (`prisma/dev.db`). Generated client outputs to `src/generated/prisma/` (non-default location). The schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database. Projects store serialized VFS state (`data` as JSON string) and chat history (`messages` as JSON string). Server Actions in `src/actions/` handle project CRUD.
