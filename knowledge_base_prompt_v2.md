# Homelab Knowledge Base — Claude Code Prompt

## What You Are Building

A self-hosted, internal knowledge base application for documenting a homelab
environment. Styled after Zendesk/ServiceNow in structure and navigation, but
purpose-built for a single operator managing a complex homelab. The application
includes a rich article editor, role-based access control, full-text search, and
a RAG-powered AI assistant that answers questions based exclusively on the user's
own documentation.

Everything runs on a single machine — **Ordis** — the dedicated AI server that
already runs Ollama. The entire stack is one Docker Compose deployment. Ollama
runs natively on the host and is reached by the backend via host.docker.internal.

**Deployment target:** Ordis (AI inference server, dual RTX 5060 Ti, 32GB VRAM)
**Persistent data:** Volume mounted to UNRAID NAS at 192.168.0.4 for backups
**Access:** Internal VLAN only. Never exposed to the internet. No cloud dependencies.

---

## Architecture

### Backend
- **Framework:** FastAPI (Python, async)
- **Database:** PostgreSQL with the `pgvector` extension
  - Standard articles, users, feedback stored in PostgreSQL
  - Article embeddings stored as pgvector vectors in the same database
  - Full-text search via PostgreSQL tsvector (no Elasticsearch — overkill for
    this scale and unnecessary operational complexity)
- **ORM:** SQLAlchemy async with Alembic for migrations
- **Auth:** JWT-based with refresh tokens, bcrypt password hashing
- **Embeddings:** Generated via Ollama on the host using `nomic-embed-text`.
  Backend calls `http://host.docker.internal:11434` to generate embeddings
  whenever an article is created or updated. Embeddings stored in pgvector.
- **AI Answer Generation:** Also via Ollama on the host. Use `llama3.2:3b` for
  RAG answer generation. A smaller model is intentional — the RAG model's job is
  to synthesize retrieved article chunks, not deep reasoning. 3B is fast, uses
  ~2GB VRAM, and leaves the rest of the 32GB free for Council sessions or other
  large models loaded manually. Streams responses to the frontend via SSE.
  The RAG pipeline: embed the query → cosine similarity search in pgvector →
  retrieve top N relevant article chunks → assemble context → stream answer.
- **Model persistence:** Pass `keep_alive: -1` on every Ollama API call for both
  `nomic-embed-text` and `llama3.2:3b`. This keeps both models permanently resident
  in VRAM so there is zero load delay when a query arrives. Combined VRAM footprint
  is under 2.5GB — negligible on this hardware. Do NOT set the global
  `OLLAMA_KEEP_ALIVE` environment variable — use per-request keep_alive only, so
  other models loaded on this machine follow normal unload behavior and don't get
  stuck in VRAM unnecessarily.

### Frontend
- **Framework:** React (Vite)
- **Editor:** TipTap — rich text editor supporting Markdown, HTML, and plain text.
  Handles keybindings, image paste/drag, text color, and is highly extensible.
- **Styling:** Tailwind CSS
- **Markdown rendering:** Article view mode renders stored content with syntax
  highlighting for code blocks

### Deployment
- Single Docker Compose stack on Ordis
- Services: backend, frontend (nginx), PostgreSQL
- Ollama runs natively on the Ordis host — NOT in Docker. Reached via
  `host.docker.internal:11434`. The `extra_hosts: host.docker.internal:host-gateway`
  mapping is already configured and working on this machine.
- PostgreSQL data volume mounted to UNRAID via a configurable path env var
  for persistent storage and backup access
- Nginx reverse proxy in the frontend container proxies `/api/` to the backend
  with `proxy_buffering off` for SSE streaming

---

## Project Structure

```
homelab-kb/
├── backend/
│   ├── main.py
│   ├── routers/
│   │   ├── articles.py       # CRUD for articles
│   │   ├── auth.py           # Login, token refresh
│   │   ├── search.py         # Full-text and semantic search
│   │   ├── ai.py             # RAG query endpoint, SSE streaming
│   │   └── users.py          # User and role management (admin only)
│   ├── models/
│   │   ├── article.py        # Article model with tsvector + vector columns
│   │   ├── user.py           # User model with role enum
│   │   └── feedback.py       # Article feedback model
│   ├── services/
│   │   ├── embeddings.py     # Ollama embedding calls via host.docker.internal
│   │   ├── rag.py            # Retrieval, context assembly, answer streaming
│   │   └── search.py         # Full-text search query builder
│   ├── core/
│   │   ├── auth.py           # JWT logic, password hashing
│   │   ├── config.py         # Settings loaded from environment variables
│   │   └── database.py       # SQLAlchemy async engine and session
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ArticleView.jsx      # Read mode — rendered article content
│   │   │   ├── ArticleEditor.jsx    # Write/edit mode — TipTap editor
│   │   │   ├── Search.jsx           # Search results + AI answer panel
│   │   │   └── Admin.jsx            # User management (admin only)
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Category/article navigation tree
│   │   │   ├── SearchBar.jsx        # Global search input
│   │   │   ├── AIAnswerPanel.jsx    # Streaming AI answer with source citations
│   │   │   ├── FeedbackBox.jsx      # Reader feedback at article bottom
│   │   │   ├── RoleGuard.jsx        # Permission-based component rendering
│   │   │   └── Editor/
│   │   │       ├── TipTapEditor.jsx # Main editor component
│   │   │       ├── Toolbar.jsx      # Formatting toolbar
│   │   │       └── extensions.js   # TipTap extension configuration
│   │   ├── hooks/
│   │   │   ├── useAuth.js           # Auth state and token management
│   │   │   └── useRAGStream.js      # SSE hook for streaming AI answers
│   │   └── App.jsx
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## User Roles & Permissions

Three roles enforced on every API endpoint via FastAPI dependency injection.
Never trust the frontend for authorization — always validate role server-side.

| Action | Reader | Editor | Admin |
|---|---|---|---|
| Read articles | ✓ | ✓ | ✓ |
| Submit feedback | ✓ | ✓ | ✓ |
| Use AI search | ✓ | ✓ | ✓ |
| Create articles | ✗ | ✓ | ✓ |
| Edit articles | ✗ | ✓ | ✓ |
| Delete articles | ✗ | ✓ | ✓ |
| View feedback | ✗ | ✓ | ✓ |
| Manage users | ✗ | ✗ | ✓ |
| Assign roles | ✗ | ✗ | ✓ |

---

## Article Editor (TipTap)

Configure TipTap with the following extensions:

- `StarterKit` — base formatting: bold, italic, headings H1-H3, ordered/unordered
  lists, blockquote, horizontal rule, code inline
- `Markdown` — live Markdown shortcut syntax (type `**bold**` and it renders)
- `Image` — paste and drag images. Store as base64 in the database. No separate
  file upload service needed at this scale.
- `TextStyle` + `Color` — text color via toolbar color picker
- `Highlight` — text background highlighting
- `CodeBlockLowlight` — syntax highlighted code blocks, auto-detect language
- `Link` — clickable links with edit/remove popup
- `Table` — insert and edit tables
- `Placeholder` — "Start writing..." placeholder text

### Keybindings (must work):
- `Ctrl+B` — Bold
- `Ctrl+I` — Italic
- `Ctrl+K` — Insert link
- `Ctrl+Z` / `Ctrl+Shift+Z` — Undo/Redo
- `Ctrl+Shift+8` — Bullet list
- `Ctrl+Shift+9` — Ordered list
- `Ctrl+\`` — Inline code
- `Tab` inside lists — indent
- Markdown shortcuts: `## ` for H2, `- ` for bullet, `> ` for blockquote,
  `\`\`\`` for code block

### Toolbar
Visible formatting toolbar above the editor with buttons for all major formatting
options. Include a color picker for text color. Show active state on buttons
(bold button appears pressed when cursor is in bold text).

### Image Handling
- Paste image from clipboard → inserts inline
- Drag image file onto editor → inserts inline
- Click image to select, drag to reposition within content
- Store as base64 data URI in the article body (no separate upload endpoint)

---

## Search & AI Assistant

### Standard Search
- PostgreSQL full-text search using tsvector on article title and body
- Returns ranked list of matching articles with highlighted snippets
- Fast — no external service required

### AI Search (RAG)
When a user submits a search query the following pipeline runs:

1. **Embed the query** — call Ollama (`nomic-embed-text`) via
   `http://host.docker.internal:11434/api/embeddings` to get a query vector
2. **Retrieve relevant chunks** — cosine similarity search in pgvector against
   stored article embeddings. Return top 5 most relevant article chunks.
3. **Assemble context** — build a prompt containing the retrieved chunks with
   article titles as attribution headers
4. **Stream the answer** — call Ollama (`llama3.2:3b`) with the context prompt
   and stream the response back to the frontend via SSE
5. **Show source citations** — below the streamed answer, display which articles
   were used as sources with links to the full articles

### RAG System Prompt
The AI assistant must be instructed to:
- Answer ONLY based on the provided article context
- Never invent information not present in the articles
- If the articles don't contain enough information to answer, say so explicitly
- Always cite which article(s) the answer came from
- Match the user's homelab setup as described in the articles — if articles
  describe a specific configuration, answer based on that configuration

### Article Chunking & Embedding
When an article is saved:
- Split the article body into chunks of approximately 512 tokens with 50 token
  overlap between chunks
- Generate an embedding for each chunk via Ollama nomic-embed-text
- Store chunks and their embeddings in a separate `article_chunks` table linked
  to the article
- On article update, delete old chunks and regenerate
- On article delete, cascade delete all chunks

### Frontend AI Answer Panel
- Appears below standard search results
- Shows a "Thinking..." indicator while the SSE stream opens
- Streams the answer token by token as it generates
- Displays source article links below the answer
- Has a "Based on your documentation" label to make clear this is not general AI

---

## UI Design

Dark theme. Technical and clean — inspired by internal tooling aesthetics, not
consumer SaaS. Think IDE meets documentation portal.

### Layout
```
┌─────────────────────────────────────────────────────┐
│  [Logo] Homelab KB          [Search Bar]  [User]   │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   Sidebar    │   Article Content Area               │
│              │                                      │
│   Categories │   # Article Title                    │
│   └ Article  │                                      │
│   └ Article  │   Article body rendered here         │
│              │   with proper typography             │
│   └ Article  │                                      │
│              │   ────────────────────────────       │
│              │   Feedback Box (readers)             │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Search Results Layout
```
┌─────────────────────────────────────────────────────┐
│  Search: "reverse proxy"                            │
├─────────────────────────────────────────────────────┤
│  🤖 AI Answer                    Based on your docs │
│  ┌───────────────────────────────────────────────┐  │
│  │ To add a new reverse proxy host in your       │  │
│  │ setup, navigate to NPM at 192.168.0.x...      │  │
│  │ Sources: [NPM Setup Guide] [VLAN Config]      │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Articles (3 results)                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ NPM Setup Guide                               │  │
│  │ ...how to configure Nginx Proxy Manager...    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Design Details
- Dark background (#0d0d0f range)
- Monospace or mixed mono/sans typography
- Sidebar shows article tree with category grouping, collapsible sections
- Article titles use a clear typographic hierarchy
- Code blocks use a distinct background with syntax highlighting
- Active/selected states clearly visible in sidebar
- Editor toolbar is compact and unobtrusive, appears above the editing area
- Mobile-friendly — sidebar collapses to hamburger on small screens

---

## Docker Compose

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://kb:kb@db:5432/homelab_kb
      - OLLAMA_URL=http://host.docker.internal:11434
      - OLLAMA_EMBED_MODEL=nomic-embed-text
      - OLLAMA_RAG_MODEL=llama3.2:3b
      - JWT_SECRET=${JWT_SECRET}
      - DATA_PATH=/app/data
    volumes:
      - kb_data:/app/data
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3010:3000"
    depends_on:
      - backend
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_USER=kb
      - POSTGRES_PASSWORD=kb
      - POSTGRES_DB=homelab_kb
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  kb_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DATA_PATH:-./data}
  db_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DB_PATH:-./db_data}
```

Note: Use `pgvector/pgvector:pg16` as the PostgreSQL image — it includes the
pgvector extension pre-installed. Run `CREATE EXTENSION IF NOT EXISTS vector;`
in the first migration.

---

## Security Requirements

- JWT access tokens expire in 15 minutes, refresh tokens in 7 days
- Bcrypt password hashing with appropriate cost factor
- All article content sanitized server-side before storage (prevent XSS)
- Input validation on all endpoints via Pydantic models
- Role checked server-side on every protected endpoint — no frontend-only gates
- Rate limiting on the AI search endpoint (expensive — limit to reasonable RPM)
- Content Security Policy header on all responses
- PostgreSQL not exposed outside the Docker network (no host port mapping)
- CORS configured to allow only the frontend origin
- File/image content validated before base64 storage

---

## Environment Variables

Provide a `.env.example` file:

```
JWT_SECRET=change_this_to_a_long_random_string
DATA_PATH=/mnt/your/unraid/path/kb_data
DB_PATH=/mnt/your/unraid/path/kb_db
```

---

## Ollama Model Requirements

These models must be pulled on the host (Ordis) before running:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2:3b
```

The backend should check both models are available at startup via
`/api/tags` and log a clear warning if either is missing, but not crash —
gracefully degrade AI search if Ollama is unavailable, falling back to
standard full-text search only.

---

## What to Avoid

- No Elasticsearch — PostgreSQL full-text search is sufficient at this scale
- No Kubernetes or Docker Swarm — single Compose stack only
- No cloud services, external APIs, or SaaS dependencies
- No SQLite — PostgreSQL only
- No separate file upload service — base64 image storage in the database
- No Redis or message queues — unnecessary complexity for a single-user tool
- No separate embedding microservice — embeddings generated inline on article save
- Do not expose the PostgreSQL port to the host
- Do not store plaintext passwords
- Do not make the AI assistant answer from general knowledge —
  it must only answer from retrieved article context

---

## Success Criteria

1. `docker compose up` starts all three services cleanly on Ordis
2. App is accessible at `http://ordis-ip:3010` from within the VLAN
3. Admin can create users and assign roles
4. Editor can create, edit, and delete articles using the TipTap editor
5. All keybindings work correctly in the editor
6. Images can be pasted and dragged within the editor
7. Text color and highlighting work via the toolbar
8. Reader cannot access editor or admin pages (enforced server-side)
9. Standard search returns relevant articles with highlighted snippets
10. AI search streams an answer based on article content with source citations
11. AI answer correctly references homelab-specific details from articles
    (e.g., if an article mentions NPM is at a specific IP, the AI knows that)
12. Saving an article triggers embedding generation via Ollama automatically
13. If Ollama is unreachable, standard search still works — no crash
14. PostgreSQL data persists across container restarts via the volume mounts
15. The UI is dark-themed, clean, and readable — not a generic scaffold
