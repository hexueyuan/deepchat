# Dynamic Layout with Responsive Font Scaling

## Overview

Implement a dynamic layout system that adapts chat and workspace panel proportions based on context, with font sizes that scale independently per panel using CSS Container Queries.

## Goals

- Chat-only mode: content uses wider max-width (1280px) to better utilize screen space
- Workspace open: percentage-based split (default 35:65) replacing fixed-pixel panel width
- Draggable divider with ratio persistence
- Font sizes scale dynamically per panel width via CSS Container Queries
- Each panel (chat, workspace) scales independently

## Layout System

### Chat-Only Mode

- Chat content max-width: `max-w-7xl` (1280px), centered with `mx-auto`
- Input box and status bar follow same max-width
- Sidebar behavior unchanged (48px collapsed / 288px expanded)

### Workspace Open Mode

- Switch from fixed-pixel panel width to percentage-based flex split
- Default ratio: 35% chat / 65% workspace
- Constraints: chat min 20%, max 60%; workspace min 30%, max 80%
- Chat content: remove max-width, fill available space (keep `px-4` padding)
- Input box and status bar: also fill available space

### Draggable Divider

- Reuse existing mousedown drag mechanism in ChatSidePanel.vue
- Convert from pixel calculation to percentage calculation
- On drag end: persist ratio to localStorage (replace current pixel-based `chat-sidepanel-width`)
- Key: `chat-sidepanel-ratio`, default value: `0.65` (workspace share)

### Transition Animation

- Open workspace: animate from 100:0 to stored ratio, 200ms ease-out (matches existing)
- Close workspace: animate from current ratio back to 100:0
- Sidebar toggle: percentage unchanged, container queries handle font adaptation automatically
- Window resize: percentage unchanged, container queries adapt

## Font Scaling

### Mechanism

CSS Container Queries with `cqi` units.

### Container Setup

- Chat area container: `container-type: inline-size` on ChatTabView's chat wrapper
- Workspace container: `container-type: inline-size` on ChatSidePanel's content area

### Font Size Formula

```css
font-size: calc(clamp(12px, 2.2cqi, 18px) * var(--dc-font-scale));
```

- Lower bound: 12px (readability floor)
- Upper bound: 18px (prevent oversized text)
- `--dc-font-scale`: derived from global font level setting (text-sm=0.875, text-base=1, text-lg=1.125, text-xl=1.25, text-2xl=1.5)

### Scope

Affected:
- Chat area: message bubbles, input box, status bar text
- Workspace: internal content text

Not affected:
- Sidebar, AppBar, Tab bar, and other fixed UI elements

### Integration with Global Font Setting

- Current global font level (5 levels) continues to work
- Global level sets `--dc-font-scale` CSS variable on root
- Container query formula multiplies by this scale
- User's font preference is respected; container queries add width-based adaptation on top

## Files to Modify

| File | Change |
|------|--------|
| `src/renderer/src/stores/ui/sidepanel.ts` | `width` (px) → `ratio` (0-1); `clampWidth` → `clampRatio`; persist ratio to localStorage |
| `src/renderer/src/components/sidepanel/ChatSidePanel.vue` | Drag logic: px → ratio; add `container-type: inline-size` |
| `src/renderer/src/views/ChatTabView.vue` | Flex split: `flex-1` + px → percentage flex; chat wrapper: `container-type: inline-size` |
| `src/renderer/src/pages/ChatPage.vue` | Input/status max-width: conditional (7xl when chat-only, removed when workspace open) |
| `src/renderer/src/components/messages/MessageList.vue` | Message max-width: conditional (7xl when chat-only, removed when workspace open) |
| `src/renderer/src/stores/uiSettingsStore.ts` | Output `--dc-font-scale` CSS variable from font level |
| Global CSS or Tailwind config | Container query font rules |

## Files Not Changed

- Sidebar (WindowSideBar.vue, sidebar store)
- AppBar
- Router, IPC, preload
- Main process presenters

## Edge Cases

- Very narrow window: ratio constraints prevent either panel from becoming unusable; font clamp prevents text below 12px
- Sidebar expand/collapse: available space changes, ratio stays, container queries adapt font
- Migration: existing `chat-sidepanel-width` in localStorage should be ignored/cleaned up when new `chat-sidepanel-ratio` is introduced
