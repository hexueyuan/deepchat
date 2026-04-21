# Remove Built-in Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip all built-in default configurations from DeepChat — providers, MCP services, marketplace integrations, external knowledge base UI, and skills — leaving only user-configurable entry points.

**Architecture:** Config-data-only changes. Clear default arrays/objects, delete resource files, hide UI components. All implementation code preserved. Existing user configs unaffected (stored in electron-store).

**Tech Stack:** TypeScript, Vue 3, Electron

---

### Task 1: Clear Default Providers

**Files:**
- Modify: `src/main/presenter/configPresenter/providers.ts:1-840`
- Modify: `src/shared/providerDbCatalog.ts:1`
- Delete: `resources/model-db/providers.json`

- [ ] **Step 1: Clear DEFAULT_PROVIDERS array**

In `src/main/presenter/configPresenter/providers.ts`, replace the entire file content with:

```typescript
import { LLM_PROVIDER_BASE } from '@shared/presenter'

export const DEFAULT_PROVIDERS: LLM_PROVIDER_BASE[] = []
```

- [ ] **Step 2: Clear PROVIDER_DB_BACKED_PROVIDER_IDS**

In `src/shared/providerDbCatalog.ts`, change line 1 from:
```typescript
const PROVIDER_DB_BACKED_PROVIDER_IDS = new Set(['doubao', 'zhipu', 'minimax', 'o3fan'])
```
to:
```typescript
const PROVIDER_DB_BACKED_PROVIDER_IDS = new Set<string>([])
```

- [ ] **Step 3: Delete providers.json**

```bash
rm resources/model-db/providers.json
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm run typecheck
```
Expected: PASS (no type errors — DEFAULT_PROVIDERS is typed as array, empty is valid)

- [ ] **Step 5: Commit**

```bash
git add src/main/presenter/configPresenter/providers.ts src/shared/providerDbCatalog.ts resources/model-db/providers.json
git commit -m "feat: remove built-in default providers and model database"
```

---

### Task 2: Clear Default MCP Services

**Files:**
- Modify: `src/main/presenter/configPresenter/mcpConfHelper.ts:62-279`
- Modify: `src/main/presenter/mcpPresenter/inMemoryServers/builder.ts:20-86`

- [ ] **Step 1: Replace PLATFORM_SPECIFIC_SERVERS**

In `src/main/presenter/configPresenter/mcpConfHelper.ts`, replace lines 62-92 (the entire `PLATFORM_SPECIFIC_SERVERS` object) with:

```typescript
const PLATFORM_SPECIFIC_SERVERS: Record<string, Omit<MCPServerConfig, 'enabled'>> = {}
```

- [ ] **Step 2: Replace DEFAULT_INMEMORY_SERVERS**

Replace lines 113-253 (the entire `DEFAULT_INMEMORY_SERVERS` object) with:

```typescript
const DEFAULT_INMEMORY_SERVERS: Record<string, Omit<MCPServerConfig, 'enabled'>> = {
  builtinKnowledge: {
    args: [],
    descriptions: 'DeepChat内置知识库检索服务',
    icons: '📚',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'builtinKnowledge',
    env: {
      configs: []
    },
    disable: false
  }
}
```

- [ ] **Step 3: Replace DEFAULT_ENABLED_SERVER_NAMES**

Replace line 255:
```typescript
const DEFAULT_ENABLED_SERVER_NAMES = ['Artifacts', ...(isMacOS() ? ['deepchat/apple-server'] : [])]
```
with:
```typescript
const DEFAULT_ENABLED_SERVER_NAMES: string[] = []
```

- [ ] **Step 4: Replace DEFAULT_MCP_SERVERS**

Replace lines 257-278 (the `DEFAULT_MCP_SERVERS` object) with:

```typescript
const DEFAULT_MCP_SERVERS = {
  mcpServers: {
    ...DEFAULT_INMEMORY_SERVERS
  } satisfies Record<string, Omit<MCPServerConfig, 'enabled'>>,
  mcpEnabled: false
}
```

This removes the `nowledge-mem` entry.

- [ ] **Step 5: Trim builder.ts switch**

In `src/main/presenter/mcpPresenter/inMemoryServers/builder.ts`, replace the switch body (lines 20-86) keeping only `builtinKnowledge` and `default`:

```typescript
    switch (serverName) {
      case 'builtinKnowledge':
        return new BuiltinKnowledgeServer(
          env as {
            configs: BuiltinKnowledgeConfig[]
          }
        )
      default:
        throw new Error(`Unknown in-memory server: ${serverName}`)
    }
```

Remove unused imports at the top of builder.ts that are no longer referenced in the switch (ArtifactsServer, BochaSearchServer, BraveSearchServer, etc.). Keep only `BuiltinKnowledgeServer` and `BuiltinKnowledgeConfig` imports.

- [ ] **Step 6: Run typecheck**

```bash
pnpm run typecheck
```
Expected: PASS. The `isMacOS` import in mcpConfHelper.ts may become unused — remove it if so.

- [ ] **Step 7: Commit**

```bash
git add src/main/presenter/configPresenter/mcpConfHelper.ts src/main/presenter/mcpPresenter/inMemoryServers/builder.ts
git commit -m "feat: remove built-in MCP services except builtinKnowledge"
```

---

### Task 3: Remove MCP Market & ModelScope Sync UI

**Files:**
- Modify: `src/renderer/settings/components/McpSettings.vue:1-189`
- Modify: `src/renderer/src/components/mcp-config/components/McpServers.vue:329` (market dropdown item)
- Modify: `src/renderer/settings/components/ModelProviderSettingsDetail.vue:58,103`

- [ ] **Step 1: Remove McpBuiltinMarket from McpSettings.vue**

In `src/renderer/settings/components/McpSettings.vue`:

Remove the template block for market view (lines 2-4):
```html
  <div v-if="isMarketView" class="w-full h-full">
    <McpBuiltinMarket embedded @back="closeMarketView" />
  </div>
```

Change line 6 from `<div v-else ...>` to just `<div ...>` (remove the `v-else`).

Remove the import (line 156):
```typescript
import McpBuiltinMarket from './McpBuiltinMarket.vue'
```

Remove the computed property (line 189):
```typescript
const isMarketView = computed(() => route.query.view === 'market')
```

Remove the `closeMarketView` function if it exists.

- [ ] **Step 2: Remove market dropdown item from McpServers.vue**

In `src/renderer/src/components/mcp-config/components/McpServers.vue`, remove the dropdown menu item at line 329:
```html
              <DropdownMenuItem class="text-xs" @click="openMarketView">
```
and its content/closing tag. Also remove the `openMarketView` function (line 189).

- [ ] **Step 3: Remove ModelScopeMcpSync from ModelProviderSettingsDetail.vue**

In `src/renderer/settings/components/ModelProviderSettingsDetail.vue`:

Remove line 58:
```html
      <ModelScopeMcpSync v-if="provider.id === 'modelscope'" :provider="provider" />
```

Remove the import at line 103:
```typescript
import ModelScopeMcpSync from './ModelScopeMcpSync.vue'
```

- [ ] **Step 4: Run typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/settings/components/McpSettings.vue src/renderer/src/components/mcp-config/components/McpServers.vue src/renderer/settings/components/ModelProviderSettingsDetail.vue
git commit -m "feat: remove MCP market and ModelScope sync UI entries"
```

---

### Task 4: Remove External Knowledge Base UI

**Files:**
- Modify: `src/renderer/settings/components/KnowledgeBaseSettings.vue:1-71`

- [ ] **Step 1: Remove external KB components from template**

In `src/renderer/settings/components/KnowledgeBaseSettings.vue`, remove these lines from the template (lines 11-16 and 23-24):

```html
        <!-- RAGFlow知识库 -->
        <RagflowKnowledgeSettings ref="ragflowSettingsRef" />
        <!-- Dify知识库 -->
        <DifyKnowledgeSettings ref="difySettingsRef" />
        <!-- FastGPT知识库 -->
        <FastGptKnowledgeSettings ref="fastGptSettingsRef" />
```

and:

```html
        <!-- NowledgeMem Integration -->
        <NowledgeMemSettings ref="nowledgeMemSettingsRef" />
```

Keep only the `<BuiltinKnowledgeSettings>` block (lines 17-22).

- [ ] **Step 2: Remove imports and refs**

Remove these imports (lines 41-44):
```typescript
import RagflowKnowledgeSettings from './RagflowKnowledgeSettings.vue'
import DifyKnowledgeSettings from './DifyKnowledgeSettings.vue'
import FastGptKnowledgeSettings from './FastGptKnowledgeSettings.vue'
import NowledgeMemSettings from './NowledgeMemSettings.vue'
```

Remove these refs (lines 50-53):
```typescript
const difySettingsRef = ref<InstanceType<typeof DifyKnowledgeSettings> | null>(null)
const ragflowSettingsRef = ref<InstanceType<typeof RagflowKnowledgeSettings> | null>(null)
const fastGptSettingsRef = ref<InstanceType<typeof FastGptKnowledgeSettings> | null>(null)
const nowledgeMemSettingsRef = ref<InstanceType<typeof NowledgeMemSettings> | null>(null)
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/settings/components/KnowledgeBaseSettings.vue
git commit -m "feat: remove external knowledge base UI (Dify/RAGFlow/FastGPT/NowledgeMem)"
```

---

### Task 5: Remove ACP Registry UI

**Files:**
- Modify: `src/renderer/settings/components/AcpSettings.vue:20-36,385-548`
- Modify: `src/main/presenter/configPresenter/index.ts:410-423`
- Delete: `resources/acp-registry/registry.json`
- Delete: `resources/acp-registry/icons/` (27 SVG files)
- Delete: `resources/acp-registry/.icons-tmp/` (if exists)

- [ ] **Step 1: Remove registry banner card from AcpSettings.vue**

In `src/renderer/settings/components/AcpSettings.vue`, remove the registry install entry card (lines 20-36):

```html
      <div
        v-if="acpEnabled"
        class="rounded-xl border bg-muted/20 px-4 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="space-y-1">
          <div class="text-sm font-semibold">{{ t('settings.acp.registryInstallEntry') }}</div>
          ...
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" @click="openRegistryDialog">
            ...
          </Button>
        </div>
      </div>
```

- [ ] **Step 2: Remove registry dialog from AcpSettings.vue**

Remove the entire `<Dialog>` block for registry browse (lines 385-548).

- [ ] **Step 3: Remove registry script code from AcpSettings.vue**

Remove:
- `registryDialog` reactive object (~line 674)
- `registryAgents` ref (~line 652)
- `openRegistryDialog` function (~line 1066)
- `filteredRegistryCatalogAgents` computed (~line 772)
- Registry data load call: `configPresenter.listAcpRegistryAgents()` (~line 837)
- Registry refresh/install/uninstall functions that operate on `AcpRegistryAgent` objects (~lines 871-945)
- Related imports: `AcpRegistryAgent` type

- [ ] **Step 4: Disable registry initialization in ConfigPresenter**

In `src/main/presenter/configPresenter/index.ts`, comment out or remove the `acpRegistryService.initialize()` call and the subsequent `syncRegistryAgentsToRepository()` (lines 415-423). Keep the `AcpRegistryService` field and import to preserve code structure.

- [ ] **Step 5: Delete registry resource files**

```bash
rm resources/acp-registry/registry.json
rm -rf resources/acp-registry/icons/
rm -rf resources/acp-registry/.icons-tmp/
```

- [ ] **Step 6: Run typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Fix any unused import warnings.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/settings/components/AcpSettings.vue src/main/presenter/configPresenter/index.ts resources/acp-registry/
git commit -m "feat: remove ACP registry UI and bundled registry data"
```

---

### Task 6: Remove Built-in Skills

**Files:**
- Delete: `resources/skills/algorithmic-art/`
- Delete: `resources/skills/code-review/`
- Delete: `resources/skills/doc-coauthoring/`
- Delete: `resources/skills/docx/`
- Delete: `resources/skills/frontend-design/`
- Delete: `resources/skills/git-commit/`
- Delete: `resources/skills/infographic-syntax-creator/`
- Delete: `resources/skills/mcp-builder/`
- Delete: `resources/skills/pdf/`
- Delete: `resources/skills/pptx/`
- Delete: `resources/skills/skill-creator/`
- Delete: `resources/skills/web-artifacts-builder/`
- Delete: `resources/skills/xlsx/`

- [ ] **Step 1: Delete 13 skill directories**

```bash
cd resources/skills
rm -rf algorithmic-art code-review doc-coauthoring docx frontend-design git-commit infographic-syntax-creator mcp-builder pdf pptx skill-creator web-artifacts-builder xlsx
```

Verify only `deepchat-settings/` remains:
```bash
ls resources/skills/
```
Expected: `deepchat-settings`

- [ ] **Step 2: Run typecheck**

```bash
pnpm run typecheck
```
Expected: PASS (skills are resource files, no TypeScript references)

- [ ] **Step 3: Commit**

```bash
git add resources/skills/
git commit -m "feat: remove built-in skills except deepchat-settings"
```

---

### Task 7: Format, Lint, and Final Verification

**Files:** All modified files from Tasks 1-6

- [ ] **Step 1: Run format**

```bash
pnpm run format
```

- [ ] **Step 2: Run i18n**

```bash
pnpm run i18n
```

- [ ] **Step 3: Run lint**

```bash
pnpm run lint
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm run typecheck
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Fix any failures. Likely candidates: tests that reference default providers or default MCP servers may need updating.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint/format/test issues after removing built-in defaults"
```
