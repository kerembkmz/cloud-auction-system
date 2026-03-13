# AGENTS.md - Cloud Auction System

## Project Overview

A Next.js auction system with Firebase backend. Features include user authentication (signup/login), home page with active auctions, and user profiles. Target: responsive, clean, minimalist UI design.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **Backend:** Firebase
- **Package Manager:** Bun

---

## Commands

### Development

```bash
cd frontend
bun install    # Install dependencies
bun run dev    # Start dev server at http://localhost:3000
```

### Build & Production

```bash
cd frontend
bun run build  # Production build
bun run start  # Start production server
```

### Linting

```bash
cd frontend
bun run lint   # Run ESLint
```

### Running a Single Test

```bash
# Using Bun test runner
bun test <test-file-path>

# Example: bun test app/components/Button.test.ts
```

---

## Code Style Guidelines

### TypeScript

- **Always use strict typing.** Avoid `any` and `unknown`.
- Enable `strict: true` in tsconfig.json (already set).
- Use explicit return types for functions when beneficial for clarity.
- Prefer interfaces over types for object shapes.
- Use utility types (e.g., `Pick`, `Omit`, `Partial`) when appropriate.

```typescript
// Good
interface User {
  id: string;
  email: string;
  displayName: string;
}

// Bad
interface User {
  [key: string]: any;
}
```

### Naming Conventions

- **Files:** kebab-case for components (`signup-page.tsx`), camelCase for utilities.
- **Components:** PascalCase (`Button.tsx`, `UserProfile.tsx`).
- **Variables/functions:** camelCase.
- **Constants:** UPPER_SNAKE_CASE or camelCase with prefix `k` for magic values.
- **Booleans:** Use `is`, `has`, `can`, `should` prefixes.

### Imports

- Use absolute imports with `@/` prefix (configured in tsconfig).
- Order imports: external libs, then relative imports.
- Group: React/Next imports, third-party, then local.

```typescript
import { useState, useEffect } from "react";
import Link from "next/link";
import { FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { UserService } from "@/services/user";
```

### React/Next.js Patterns

- Use Server Components by default; add `"use client"` only when needed.
- Keep components small and focused.
- Extract reusable logic into custom hooks.
- Use proper TypeScript types for props.

```typescript
// Good - explicit props typing
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ children, onClick, variant = "primary", disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} className={...}>
      {children}
    </button>
  );
}
```

### Error Handling

- Use try/catch for async operations with proper error typing.
- Avoid silent failures - always handle errors explicitly.
- Create typed error classes or use union types for error states.
- Display user-friendly error messages in UI.

```typescript
// Good
interface ApiError {
  code: string;
  message: string;
}

async function fetchAuction(id: string): Promise<Auction | ApiError> {
  try {
    const doc = await getDoc(docRef);
    if (!doc.exists()) {
      return { code: "NOT_FOUND", message: "Auction not found" };
    }
    return { id: doc.id, ...doc.data() } as Auction;
  } catch (error) {
    if (error instanceof Error) {
      return { code: "FETCH_ERROR", message: error.message };
    }
    return { code: "UNKNOWN", message: "An unexpected error occurred" };
  }
}
```

### UI/Styling (Tailwind CSS)

- **No blue or purple colors.** Use slate, gray, zinc, neutral, or custom neutral palette.
- **No gradients.** Use solid colors only.
- Use Tailwind's slate scale for grays (e.g., `bg-slate-50`, `text-slate-900`).
- Keep designs clean and minimalist.
- Ensure responsive design using mobile-first approach (`sm:`, `md:`, `lg:` prefixes).
- Use semantic HTML elements.

```typescript
// Good
<div className="bg-slate-100 min-h-screen">
  <button className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-700">
    Submit
  </button>
</div>

// Bad
<div className="bg-gradient-to-r from-blue-500 to-purple-600">
  <button className="bg-blue-600">
    Submit
  </button>
</div>
```

### Firebase Integration

- Initialize Firebase in a dedicated module (`lib/firebase.ts`).
- Use Firebase typed collections and documents.
- Keep Firebase logic in service layers (`services/` directory).
- Implement proper auth state handling.

### File Organization

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx            # Login page (root)
│   ├── signup/
│   │   └── page.tsx
│   ├── auction/
│   │   └── page.tsx
│   └── profile/
│       └── page.tsx
├── components/             # Reusable UI components
├── lib/                    # Utilities and Firebase setup
├── services/               # Firebase services (auth, firestore)
├── types/                  # TypeScript type definitions
└── hooks/                  # Custom React hooks
```

---

## Firebase Schema (Reference)

```typescript
// users collection
interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  balance: number;
  freezed_balance: number;
}

// auctions collection
interface Auction {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  highestBidderId: string | null;
  endsAt: Timestamp;
  createdBy: string;
  status: "active" | "ended" | "cancelled";
  createdAt: Timestamp;
}
```

---

## Git Conventions

### Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format for all commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

**Rules:**
- Use lowercase for type and description
- Use imperative mood ("add" not "added")
- Keep subject line under 72 characters
- Reference issues in footer using `Closes #123` or `Fixes #456`

**Examples:**
```
feat(auth): add email verification flow
fix(auction): resolve bid placement race condition
docs: update API documentation
refactor(firebase): extract auth service into separate module
```

---

## General Guidelines

- Write professional code without overcommenting.
- No emojis in code or commit messages.
- Do not overengineer - keep solutions simple and pragmatic.
- Always verify code compiles with `bun run build` before submitting.
- Run linting with `bun run lint` and fix all warnings.
- Use meaningful variable and function names.
- Keep functions small and single-purpose.
- Prefer early returns over nested conditionals.
