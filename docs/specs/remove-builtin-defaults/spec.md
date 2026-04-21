# Remove Built-in Defaults Spec

## Goal

Strip all built-in default configurations from DeepChat, leaving only configuration entry points for users to self-configure. The app ships "empty" — no pre-populated providers, no default MCP services (except builtinKnowledge), no marketplace integrations, and only `deepchat-settings` skill.

## Principles

- **Data only**: Remove default data/config, preserve all implementation code
- **Deep cleanup**: Remove UI entry points, navigation items, and i18n references for hidden features
- **Reversible**: Implementation code stays intact; re-adding defaults is trivial

---

## Module 1: Service Providers

### Changes

| File | Change |
|------|--------|
| `src/main/presenter/configPresenter/providers.ts` | `DEFAULT_PROVIDERS = []` |
| `resources/model-db/providers.json` | Delete file |
| `src/shared/providerDbCatalog.ts` | `PROVIDER_DB_BACKED_PROVIDER_IDS = new Set()` |
| `src/main/presenter/configPresenter/providerHelper.ts` | Adjust init: empty store stays empty, no seeding |

### Preserved

- `providerRegistry.ts` (`PROVIDER_ID_REGISTRY`, `PROVIDER_API_TYPE_REGISTRY`)
- All provider implementation classes (AiSdkProvider, OllamaProvider, etc.)
- `providerFactory.ts` SDK factories
- Provider settings UI (add/edit/remove)

---

## Module 2: MCP Services

### Changes

| File | Change |
|------|--------|
| `src/main/presenter/configPresenter/mcpConfHelper.ts` | `DEFAULT_INMEMORY_SERVERS`: keep only `builtinKnowledge` |
| same | `PLATFORM_SPECIFIC_SERVERS = {}` (remove apple-server) |
| same | `DEFAULT_MCP_SERVERS`: no `nowledge-mem` |
| same | `DEFAULT_ENABLED_SERVER_NAMES = []` |
| same | `BUILT_IN_SERVER_NAMES`: only `'builtinKnowledge'` |
| `src/main/presenter/mcpPresenter/inMemoryServers/builder.ts` | `getInMemoryServer()`: keep only `builtinKnowledge` branch |
| Settings UI | Remove `McpBuiltinMarket.vue` entry (McpRouter market) |
| Settings UI | Remove `ModelScopeMcpSync.vue` entry (ModelScope sync) |
| Settings navigation | Remove market-related tabs/nav items |

### Preserved

- All in-memory server implementation files (`*.ts`)
- `mcpClient.ts` inmemory connection logic
- `serverManager.ts` lifecycle management
- User manual config of stdio/sse/http external MCP services

---

## Module 3: Knowledge Base UI

### Changes

| File | Change |
|------|--------|
| `src/renderer/settings/components/KnowledgeBaseSettings.vue` | Remove rendering of RagflowKnowledgeSettings, DifyKnowledgeSettings, FastGptKnowledgeSettings, NowledgeMemSettings |
| `src/shared/settingsNavigation.ts` | Remove sub-nav items for external knowledge bases (if any) |

### Preserved

- `BuiltinKnowledgeSettings.vue`, `KnowledgeFile.vue`, `KnowledgeFileItem.vue`
- Entire `knowledgePresenter` infrastructure
- External KB settings component files (just not rendered)
- External KB MCP server implementation code

---

## Module 4: Skills

### Changes

| File | Change |
|------|--------|
| `resources/skills/` | Delete 13 dirs: `algorithmic-art/`, `code-review/`, `doc-coauthoring/`, `docx/`, `frontend-design/`, `git-commit/`, `infographic-syntax-creator/`, `mcp-builder/`, `pdf/`, `pptx/`, `skill-creator/`, `web-artifacts-builder/`, `xlsx/` |

### Preserved

- `resources/skills/deepchat-settings/`
- Skill framework code (SkillPresenter, SkillTools, SkillExecutionService, etc.)
- Skill sync system (SkillSyncPresenter + 11 adapters)
- Skill management UI

---

## Module 5: Marketplace Integrations

### Changes

| File | Change |
|------|--------|
| Settings UI | Remove McpRouter market component entry |
| Settings UI | Remove ModelScope MCP sync component entry |
| `resources/acp-registry/registry.json` | Delete file |
| `src/main/presenter/configPresenter/acpRegistryService.ts` | Disable remote fetch (or make no-op when registry file missing) |
| Settings UI | Remove ACP registry browse entry (if exists) |

### Preserved

- ACP Provider (`acpProvider.ts`) — users can manually configure
- `mcprouterManager.ts` implementation code
- `modelScopeMcp.ts` implementation code
- `acpRegistryService.ts` code structure

---

## Risk Assessment

- **Low risk**: All changes are config/data removal. Implementation code is untouched.
- **Migration**: Existing users who already have providers/MCP servers configured won't lose their configs (stored in electron-store). Only new installs / fresh configs will be empty.
- **Rollback**: Re-add the removed data/config entries to restore defaults.

## Out of Scope

- Refactoring provider/MCP/skill architecture
- Removing implementation code for unused features
- Changing the settings UI layout or adding new configuration wizards
