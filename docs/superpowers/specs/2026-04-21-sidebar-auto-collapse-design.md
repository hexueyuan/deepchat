# Sidebar Auto-Collapse on Session Selection

## Overview

When the user navigates to a chat page (selecting an existing session, starting a new conversation, or being activated via IPC), the left sidebar automatically collapses to its icon column (48px) with a smooth transition animation.

## Behavior

- **Trigger**: All operations that route to a chat page — `goToChat()` in `pageRouter.ts`
  - Selecting an existing session (`selectSession`)
  - Starting a new conversation (`startNewConversation` → `closeSession` → re-enter)
  - IPC external activation (`SESSION_EVENTS.ACTIVATED`)
  - Page initialization with active session (`initialize`)
- **Collapse target**: Reuse existing `collapsed` state (48px icon column), not full hide
- **Animation**: 300ms width transition on the sidebar container
- **No configuration**: Always enabled, no settings toggle

## Implementation

### 1. `src/renderer/src/stores/ui/pageRouter.ts`

Import `useSidebarStore` and call `sidebarStore.setCollapsed(true)` inside `goToChat()`.

### 2. `src/renderer/src/components/WindowSideBar.vue`

Add `transition-all duration-300` Tailwind classes to the sidebar root element to animate the width change.

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/src/stores/ui/pageRouter.ts` | Import sidebar store, call `setCollapsed(true)` in `goToChat()` |
| `src/renderer/src/components/WindowSideBar.vue` | Add transition classes for smooth width animation |

## Out of Scope

- No settings toggle or user configuration
- No change to sidebar collapse/expand state model
- No change to manual toggle behavior
- No change to keyboard shortcut behavior
