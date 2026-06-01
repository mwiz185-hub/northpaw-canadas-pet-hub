# Ruflo — Claude Code Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.claude/settings.json` has `attribution.commit` set (#2078). The Claude Code Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Spawning a Coordinated Team

```javascript
// ALL agents in ONE message, each knows WHO to message next
Agent({ prompt: "Research the codebase. SendMessage findings to 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Wait for 'researcher'. Design solution. SendMessage to 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Wait for 'architect'. Implement it. SendMessage to 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Wait for 'coder'. Write tests. SendMessage results to 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Wait for 'tester'. Review code quality and security.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Kick off the pipeline
SendMessage({ to: "researcher", summary: "Start", message: "[task context]" })
```

### Patterns

| Pattern | Flow | Use When |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Sequential dependencies (feature dev) |
| **Fan-out** | Lead → A, B, C → Lead | Independent parallel work (research) |
| **Supervisor** | Lead ↔ workers | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

## Swarm & Routing

### Config
- **Topology**: hierarchical-mesh (anti-drift)
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Agent Routing

| Task | Agents | Topology |
|------|--------|----------|
| Bug Fix | researcher, coder, tester | hierarchical |
| Feature | architect, coder, tester, reviewer | hierarchical |
| Refactor | architect, coder, reviewer | hierarchical |
| Performance | perf-engineer, coder | hierarchical |
| Security | security-architect, auditor | hierarchical |

### When to Swarm
- **YES**: 3+ files, new features, cross-module refactoring, API changes, security, performance
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes, questions

### 3-Tier Model Routing

| Tier | Handler | Use Cases |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2 | Haiku | Simple tasks, low complexity |
| 3 | Sonnet/Opus | Architecture, security, complex reasoning |

## Memory & Learning

### Before Any Task
```bash
npx @claude-flow/cli@latest memory search --query "[task keywords]" --namespace patterns
npx @claude-flow/cli@latest hooks route --task "[task description]"
```

### After Success
```bash
npx @claude-flow/cli@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx @claude-flow/cli@latest hooks post-task --task-id "[id]" --success true --store-results true
```

### MCP Tools (use `ToolSearch("keyword")` to discover)

| Category | Key Tools |
|----------|-----------|
| **Memory** | `memory_store`, `memory_search`, `memory_search_unified` |
| **Bridge** | `memory_import_claude`, `memory_bridge_status` |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_health` |
| **Agents** | `agent_spawn`, `agent_list`, `agent_status` |
| **Hooks** | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch` |
| **Security** | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |
| **Hive-Mind** | `hive-mind_init`, `hive-mind_consensus`, `hive-mind_spawn` |

### Background Workers

| Worker | When |
|--------|------|
| `audit` | After security changes |
| `optimize` | After performance work |
| `testgaps` | After adding features |
| `map` | Every 5+ file changes |
| `document` | After API changes |

```bash
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit
```

## Agents

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Architecture**: `system-architect`, `backend-dev`, `mobile-dev`
**Security**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Any string works as a custom agent type.

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
npm run build && npm test
```

## CLI Quick Reference

```bash
npx @claude-flow/cli@latest init --wizard           # Setup
npx @claude-flow/cli@latest swarm init --v3-mode     # Start swarm
npx @claude-flow/cli@latest memory search --query "" # Vector search
npx @claude-flow/cli@latest hooks route --task ""    # Route to agent
npx @claude-flow/cli@latest doctor --fix             # Diagnostics
npx @claude-flow/cli@latest security scan            # Security scan
npx @claude-flow/cli@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (swarm, memory, hooks). **CLI** is the same via Bash.

---

# NorthPaw — Canada's Pet Community

Tinder-style pet community app for Calgary, AB. Mating, adoption, and marketplace.

## Owner
Mukthar Mulo (mwiz185@gmail.com · GitHub: mwiz185-hub) — total beginner, first coding project.
Always explain WHY a change matters. Ask before destructive actions. Windows-friendly commands only.

## Quick start
```powershell
.\dev.ps1          # smart launcher — checks port 8080, kills blockers, starts Vite
# OR:
npm run dev        # must land on port 8080 — Google OAuth only allows that port
```
App runs at http://localhost:8080

## Repo & live
- GitHub: https://github.com/mwiz185-hub/northpaw-canadas-pet-hub (branch `main`)
- Live: https://northpaw-canadas-pet-hub.lovable.app

## Tech stack
- React 19 + TanStack Start + TanStack Router (file-based routes under `src/routes/`)
- Tailwind v4 + shadcn/ui + Vite 7
- Supabase (Postgres + Auth + Storage)
- **Bun** (`bun.lock`) — NEVER commit `package-lock.json`

## Supabase projects
| | Ref | URL | Used for |
|---|---|---|---|
| Personal | `kmweoenjmlgkvdqliupa` | `https://kmweoenjmlgkvdqliupa.supabase.co` | Local dev |
| Lovable managed | `ixrusozepgtqsbotoatv` | injected by Lovable at deploy | Production |

## Database tables (all RLS-enabled)
- `profiles` — one row per auth user; `id` = `auth.users.id`
- `pets` — `owner_id` FK; `show_in_mating`, `show_in_adoption`, `show_in_marketplace` flags; multiple pets per user supported
- `swipes` — `swiper_pet_id`, `target_pet_id`, `direction` ('like'|'pass'); UNIQUE per pair
- `matches` — created by `handle_swipe_match` trigger on mutual like
- `conversations` — one per matched pair; `kind` = 'match'|'adoption'|'marketplace'
- `messages` — realtime enabled (`REPLICA IDENTITY FULL`)
- `sales` — marketplace transactions with 2% commission
- Storage bucket: `pet-photos`

## Trigger: handle_swipe_match
Fires AFTER INSERT on `swipes`. If reciprocal 'like' exists, inserts into `matches`.
Runs `SECURITY DEFINER` (bypasses RLS). Defined in `supabase/setup_database.sql`.

## Routes
| Path | File | Notes |
|---|---|---|
| `/` | `index.tsx` | Landing; redirects signed-in users to `/app/swipe` |
| `/login` | `login.tsx` | Google OAuth + email/password |
| `/onboarding` | `onboarding.tsx` | Profile setup after first login |
| `/app` | `app.tsx` | Gated layout — redirects to `/login` or `/onboarding` |
| `/app/swipe` | `app.swipe.tsx` | Drag-to-swipe; pet selector; Test Match button |
| `/app/matches` | `app.matches.tsx` | Conversations list |
| `/app/chat/$conversationId` | `app.chat.$conversationId.tsx` | Realtime chat + sale modal |
| `/app/profile` | `app.profile.tsx` | Multi-pet list + edit form + photo upload |
| `/app/adopt` | `app.adopt.tsx` | Adoption browse |
| `/app/shop` | `app.shop.tsx` | Marketplace |

## CRITICAL: Hard-won fixes — do NOT revert

### 1. Supabase singleton (`src/integrations/supabase/client.ts`)
Stored on `globalThis.__supabase` — prevents Vite HMR from creating duplicate GoTrueClient instances that silently break OAuth.

### 2. Auth context (`src/lib/auth-context.tsx`)
Uses ONLY `onAuthStateChange`. No `getSession()` call.
Reason: `getSession()` returns null before OAuth code-exchange finishes → race condition.

### 3. Login OAuth redirect (`src/routes/login.tsx`)
`redirectTo` = `${origin}/login`, NOT `/app/swipe`.
The login page navigates to `/app/swipe` once `onAuthStateChange` fires with a session.

### 4. App gate (`src/routes/app.tsx`)
Redirects unauthenticated → `/login`, no profile row → `/onboarding`.

## Seed pets
5 pets (Luna/Max/Bella/Rocky/Daisy) owned by dummy UUID `00000000-0000-0000-0000-000000000001`.
Seed file: `supabase/seed_test_pets.sql`

## Match testing (single account)
Profile page supports multiple pets per user. On the Swipe page, a "Test Match" button appears when you have 2+ mating pets — it creates both swipes and the conversation directly, then shows the modal.

## Port 8080 is mandatory
Google OAuth JS origins only allow port 8080. If Vite picks another port:
```powershell
netstat -ano | findstr :8080   # find PID
taskkill /PID <PID> /F         # kill it
npm run dev                    # restart
```

## Git rules
- Never commit `package-lock.json`
- Show `git status` + `git diff --stat` before pushing
- Ask before destructive operations
