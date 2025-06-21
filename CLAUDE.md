# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Linting:
```bash
npm run lint
```

Start production server:
```bash
npm start
```

## Architecture Overview

This is a server-free RSS reader built with Next.js 15, TypeScript, and SQLite. The application features a sophisticated two-tier data access pattern with immediate RSS display, background full-content fetching, and intelligent scroll-based read marking.

### Core Data Flow

1. **RSS Parsing & Storage**: RSS feeds are parsed using `rss-parser` and stored in SQLite (`rss_reader.db`) via prepared statements in `src/lib/db.ts`
2. **Two-Phase Content Loading**: 
   - Immediate: `/api/articles/[id]/preview` returns RSS-only data instantly
   - Background: `/api/articles/[id]/content` fetches full article content from original URLs using JSDOM parsing
3. **Database Layer**: All database operations use prepared statements with dedicated query objects (`feedQueries`, `articleQueries`)

### Key Components Architecture

- **Main Layout**: `src/app/page.tsx` manages global state (feeds, articles, preview panel) with unread-first filtering
- **Settings Page**: `src/app/settings/page.tsx` handles feed management (add/delete/refresh) separate from main interface
- **Article Preview**: `src/components/ArticlePreview.tsx` implements sliding panel with progressive content loading and scroll-based read marking
- **Article List**: `src/components/ArticleList.tsx` features scroll-based auto-read with optimized UX (no refresh, local state)
- **Data Layer**: `src/lib/rss.ts` handles RSS parsing and article content extraction

### Database Schema

- `feeds` table: RSS feed metadata with URL uniqueness constraint
- `articles` table: Article content with feed relationships and read status tracking
- Automatic schema creation on first run

### API Routes Structure

```
/api/feeds - GET (list), POST (add), PUT (refresh all)
/api/feeds/[id] - DELETE, PUT (refresh single)
/api/articles - GET with filtering (feedId, unreadOnly)
/api/articles/[id]/preview - GET (immediate RSS data)
/api/articles/[id]/content - GET (full scraped content)
/api/articles/[id]/read - PUT (mark read), DELETE (mark unread)
```

### Content Extraction Strategy

The application uses a prioritized selector approach for content extraction:
1. Semantic selectors (`article`, `[role="main"]`)
2. Common CMS selectors (`.post-content`, `.entry-content`)
3. Fallback to paragraph collection
4. Automatic cleanup of ads, scripts, and navigation elements

### State Management Pattern

- Local component state with `useState`/`useEffect`
- Callback-based parent-child communication
- Progressive enhancement: RSS data → full content replacement when available
- Intelligent read status handling:
  - Manual read marking triggers full refresh
  - Scroll-based read marking uses local state to prevent UI flickering
  - Unread-first display with persistent visibility for currently displayed articles

## Database File

The SQLite database (`rss_reader.db`) is created automatically in the project root. For debugging database contents, use the included `db-viewer.js` script:

```bash
node db-viewer.js
```

## Key Features

### Article Preview System
- **Sliding Panel**: Right-side sliding preview panel with smooth animations
- **Progressive Loading**: Shows RSS content immediately, then fetches full article content in background
- **Content Enhancement**: Automatic extraction and cleanup of full article content from original URLs
- **Keyboard Support**: ESC key to close, responsive design (full-screen on mobile)

### Intelligent Read Management
- **Scroll-Based Auto-Read**: Articles automatically marked as read when scrolled past viewport top
- **Optimized UX**: Scroll-based reads don't cause UI refresh/flickering
- **Local State Sync**: Immediate visual feedback with background API calls
- **Persistent Display**: Current articles stay visible even when auto-marked as read in unread-only mode

### Feed Management
- **Separated Interface**: Dedicated settings page for feed management
- **Real-time Updates**: Add, delete, and refresh feeds with immediate feedback
- **URL Validation**: Duplicate prevention and RSS feed validation

### User Experience
- **Unread-First**: Default to showing only unread articles
- **Smart Filtering**: Toggle between unread-only and all articles
- **Progressive Content**: RSS summary → full content when available
- **Responsive Design**: Optimized for desktop and mobile viewing

## Important Implementation Notes

- All API routes handle async RSS parsing with timeout controls (10-15 seconds)
- Content extraction includes relative URL conversion to absolute URLs
- The preview system shows RSS data immediately, then updates with full content if available
- Feed URLs must be unique; duplicate additions are prevented at database level
- Article uniqueness is determined by link URL to prevent duplicates during feed refresh
- Scroll-based read marking uses `getBoundingClientRect()` for accurate position detection
- Local state management prevents unnecessary re-renders during scroll interactions