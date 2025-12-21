# Projex Frontend

> Production-grade React frontend for the Projex task management platform

## 🚀 Tech Stack

- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Accessible component system
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Router v7** - Routing
- **React Hook Form + Zod** - Form handling & validation
- **Framer Motion** - Animations
- **Font Awesome 7** - Icons
- **Day.js** - Date formatting

## 📁 Project Structure

```
src/
├── api/              # Axios client & API endpoint modules
│   ├── client.ts     # Axios instance with interceptors
│   ├── auth.ts       # Authentication endpoints
│   ├── projects.ts   # Projects CRUD
│   ├── lists.ts      # Lists CRUD
│   ├── tasks.ts      # Tasks CRUD
│   ├── labels.ts     # Labels CRUD
│   ├── comments.ts   # Comments CRUD
│   ├── backup.ts     # Backup import/export
│   └── googleCalendar.ts  # Google Calendar integration
│
├── components/
│   ├── common/       # Shared utility components
│   │   ├── Toaster.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── EmptyState.tsx
│   │   └── ConfirmDialog.tsx
│   │
│   ├── layout/       # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   │
│   └── ui/           # Base UI components (shadcn/ui style)
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── toast.tsx
│       └── ...
│
├── hooks/            # TanStack Query hooks
│   ├── useAuth.ts    # Authentication hooks
│   ├── useProjects.ts
│   ├── useLists.ts
│   ├── useTasks.ts
│   ├── useLabels.ts
│   ├── useComments.ts
│   └── useUsers.ts
│
├── pages/            # Route-level page components
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   └── settings/
│       └── SettingsPage.tsx
│
├── store/            # Zustand stores
│   ├── authStore.ts  # Authentication state
│   └── uiStore.ts    # UI state (sidebar, modals, toasts)
│
├── types/            # TypeScript type definitions
│   └── index.ts      # All types matching backend models
│
├── lib/              # Utility functions
│   └── utils.ts      # cn(), formatDate(), etc.
│
├── App.tsx           # Main app with routing
├── main.tsx          # Entry point
└── index.css         # Global styles & design tokens
```

## 🎨 Design System

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#6366F1` | Projects, main actions |
| Secondary | `#8B5CF6` | Lists |
| Accent | `#3B82F6` | Labels |
| Success | `#22C55E` | Completed, low priority |
| Warning | `#F59E0B` | Medium priority |
| Danger | `#EF4444` | High priority, destructive |

### Typography

- **Primary Font**: Inter
- **Monospace Font**: JetBrains Mono

### Design Principles

- Rounded corners (`rounded-xl` default)
- Soft shadows
- High contrast accessibility
- Smooth animations (Framer Motion)
- Keyboard-first UX

## 🔐 Authentication

- JWT stored in `localStorage`
- Automatic token injection via Axios interceptor
- Auto-logout on 401 responses
- 2FA support with TOTP

## 📡 API Integration

All API calls use TanStack Query for:
- Automatic caching
- Background refetching
- Optimistic updates
- Loading & error states

### Query Keys Structure

```typescript
// Projects
projectKeys.lists()           // All projects
projectKeys.detail(id)        // Single project

// Tasks
taskKeys.list({ listId, projectId, ... })  // Filtered tasks
taskKeys.detail(id)           // Single task

// Similar patterns for lists, labels, comments
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

### Environment

The frontend proxies API requests to `http://localhost:5000` by default (configured in `vite.config.ts`).

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + K` | Open command palette |
| `Escape` | Close modals/dialogs |

## 🌙 Theme Support

- Light mode (default)
- Dark mode
- System preference detection
- Persistent preference via user settings

## 📦 State Management Strategy

### Server State (TanStack Query)
- All API data (projects, lists, tasks, etc.)
- Caching with stale-while-revalidate
- Automatic background refetching

### Client State (Zustand)
- Authentication state
- UI state (sidebar, modals, theme)
- Persisted to localStorage

## 🔒 Role-Based Access

UI elements are conditionally rendered based on:
- Global user role (`user` | `admin`)
- Project/List member role (`viewer` | `editor` | `admin`)

## 📄 License

MIT License - See LICENSE file for details
