# TURTLE SOUP GAME — PROJECT SPEC

## GOAL
CLI-style web game. User solves lateral thinking puzzles via chat with multi-agent LLM system.
Focus: multi-agent architecture learning over design polish.

---

## STACK
- Frontend: Next.js + Tailwind CSS (port 3000)
- Backend: Python + FastAPI (port 8000)
- AI: Ollama (dev, port 11434) → Claude/Gemini (prod)
- Storage: JSON files (no DB)
- Tunnel: Cloudflare Tunnel (prod only)

---

## DESIGN SYSTEM
```
bg:#0a0a0a  text:#00ff41  accent:#ffcc00  error:#ff4444
font: JetBrains Mono
ui: typing-animation, blinking-cursor, > prompt
    agent tags [HOST][JUDGE][HINT], messages stack upward
```

---

## AGENTS

| name | llm | complexity | dev | prod |
|---|---|---|---|---|
| orchestrator | y | high | llama3.2:8b | claude-sonnet |
| story_generator | y | high | llama3.2:8b | gemini-2.0-flash |
| story_evaluator | y | high | llama3.2:8b | claude-sonnet |
| scorer | y | mid | llama3.2:8b | llama3.2:8b |
| host | y | mid | llama3.2:8b | llama3.2:8b |
| hint | y | low | llama3.2:3b | llama3.2:3b |
| judge | y | low | llama3.2:3b | llama3.2:3b |
| story_loader | n | - | code | code |
| admin_panel | n | - | code | code |

### MODEL_CONFIG (dev)
```python
# /backend/config/models.py
MODEL_CONFIG = {
  "orchestrator":    {"provider":"ollama","model":"llama3.2:8b"},
  "story_generator": {"provider":"ollama","model":"llama3.2:8b"},
  "story_evaluator": {"provider":"ollama","model":"llama3.2:8b"},
  "scorer":          {"provider":"ollama","model":"llama3.2:8b"},
  "host":            {"provider":"ollama","model":"llama3.2:8b"},
  "hint":            {"provider":"ollama","model":"llama3.2:3b"},
  "judge":           {"provider":"ollama","model":"llama3.2:3b"},
}
```

---

## AGENT CALL FLOW
```
user_input
  → orchestrator
    1. judge (always first): 예 | 아니오 | 관련없음
    2. host (always): contextual response using judge result
    3. hint (conditional): trigger if question_count % 5 == 0 or user requests
  → on game_end:
    4. scorer: evaluate full history

shared_context passed each call:
  { story_situation, history, question_count, hints_used }
NOTE: truth never sent to frontend, backend-only
```

---

## DATA STRUCTURES

### /backend/data/stories.json
```json
[{
  "id": "001",
  "title": "거북이 수프",
  "difficulty": "하|중|상",
  "category": "classic|custom",
  "situation": "공개 텍스트",
  "truth": "비공개 (backend only, never expose to frontend)",
  "answer_keywords": ["keyword1", "keyword2"],
  "hints": ["hint1", "hint2"],
  "source": "official|user"
}]
```

### /backend/data/pending.json
```json
[{
  "id": "uuid",
  "status": "pending|approved|rejected",
  "story": { "same fields as stories.json, minus id/source" },
  "evaluation": { "score": 85, "feedback": "..." },
  "submitted_at": "ISO8601"
}]
```

### game_session (in-memory, per request)
```json
{
  "story_id": "001",
  "situation": "...",
  "question_count": 0,
  "hints_used": 0,
  "is_solved": false,
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "agent": "host", "content": "..."}
  ]
}
```

---

## SUBMISSION FLOW
```
user submits story
  → story_evaluator → {score, format_valid, solvable, originality, feedback}
  → show evaluation to user
  → append to pending.json (status: pending)
  → admin /admin reviews list
    approve → move to stories.json (source: user)
    reject  → remove from pending.json
```

---

## ADMIN PANEL
- route: /admin (hidden, not linked from UI)
- auth: compare input against ADMIN_PASSWORD env variable
- features: list pending, approve, reject
- approved stories auto-append to stories.json

---

## SCORER OUTPUT
```json
{ "score": 87, "efficiency": 8, "logic": 7, "comment": "..." }
```

## STORY EVALUATOR OUTPUT
```json
{ "score": 90, "format_valid": true, "solvable": true, "originality": 8, "feedback": "..." }
```

---

## API ENDPOINTS
```
POST /api/game/start    init session (body: story_id | "generate")
POST /api/game/turn     one game turn (body: session + user_message)
POST /api/game/end      trigger scorer
POST /api/story/submit  submit user story → evaluator
GET  /api/stories       list stories (situation only, truth stripped)
GET  /admin/pending     list pending [auth]
POST /admin/approve     approve pending [auth]
POST /admin/reject      reject pending [auth]
```

---

## ERROR HANDLING
```
Ollama offline    → 503 "로컬 모델 오프라인"
LLM parse fail    → retry once → fallback response
truth exposure    → strip truth field before every frontend response
invalid admin pw  → 401
```

---

## PHASES

### P1: ENV SETUP
tasks: Ollama+models, FastAPI+CORS(3000), Next.js, /api/chat, fe↔be connect
milestone: browser chatbot responds 예/아니오 via local model

### P2: SINGLE AGENT + CLI UI
tasks: game_session, host system prompt, full game loop, CLI UI components
milestone: CLI chat game works end-to-end (single agent)

### P3: MULTI-AGENT SPLIT ★
tasks: MODEL_CONFIG, orchestrator routing, judge+host+hint split, agent tags in UI
milestone: 3 agents handled by orchestrator, tags visible in UI

### P4: STORY STORE + ADMIN
tasks: stories.json(10개), pending.json, story_loader, story_generator, CLI select menu, /admin
milestone: story select/generate works, admin approve→stories.json

### P5: EVALUATION AGENTS
tasks: scorer, story_evaluator, game-over ASCII screen, submit UI
milestone: score shown post-game, evaluation shown post-submit

### P6: MODEL UPGRADE + DEPLOY
tasks: Claude API, Gemini API, prod MODEL_CONFIG, Cloudflare Tunnel
milestone: complex agents on Claude/Gemini, simple on local, externally accessible

---

## PROJECT STRUCTURE
```
/
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # story select
│   │   ├── game/page.tsx      # main game
│   │   └── admin/page.tsx     # admin panel
│   └── components/
│       ├── Terminal.tsx       # CLI wrapper
│       ├── MessageLog.tsx     # upward log
│       ├── Prompt.tsx         # > input
│       └── ScoreScreen.tsx    # ASCII score
└── backend/
    ├── main.py
    ├── config/models.py       # MODEL_CONFIG
    ├── agents/
    │   ├── orchestrator.py
    │   ├── host.py
    │   ├── judge.py
    │   ├── hint.py
    │   ├── scorer.py
    │   ├── story_generator.py
    │   └── story_evaluator.py
    ├── routers/
    │   ├── game.py
    │   ├── story.py
    │   └── admin.py
    └── data/
        ├── stories.json
        └── pending.json
```

---

## CONVENTIONS
- truth: backend-only, strip before every frontend response
- all agents: async def, signature (messages: list, context: dict) -> str
- MODEL_CONFIG: single source of truth for all model switching
- ADMIN_PASSWORD: env variable only, never hardcode
- CORS: allow localhost:3000 only in dev
