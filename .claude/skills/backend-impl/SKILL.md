---
name: backend-impl
description: >
  sea-turtle-soup-ai FastAPI 백엔드 구현. 라우터 작성, Python 게임 에이전트 코드,
  Ollama API 연동, 데이터 모델 구현이 필요할 때 사용한다.
  backend-dev 에이전트가 이 스킬을 사용한다.
---

# backend-impl — 백엔드 구현 패턴

## 핵심 불변 규칙

truth 필드는 어떤 경우에도 프론트엔드로 나가지 않는다. stories.json을 읽은 뒤 반드시 다음을 실행한다:

```python
story = story_data.copy()
story.pop("truth", None)
story.pop("answer_keywords", None)
```

## FastAPI 앱 구조

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import game, story, admin

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # dev: 3000만 허용
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(game.router, prefix="/api/game")
app.include_router(story.router, prefix="/api")
app.include_router(admin.router, prefix="/admin")
```

## MODEL_CONFIG 사용 패턴

```python
# backend/config/models.py
MODEL_CONFIG = {
  "orchestrator":    {"provider": "ollama", "model": "llama3.2:8b"},
  "story_generator": {"provider": "ollama", "model": "llama3.2:8b"},
  "story_evaluator": {"provider": "ollama", "model": "llama3.2:8b"},
  "scorer":          {"provider": "ollama", "model": "llama3.2:8b"},
  "host":            {"provider": "ollama", "model": "llama3.2:8b"},
  "hint":            {"provider": "ollama", "model": "llama3.2:3b"},
  "judge":           {"provider": "ollama", "model": "llama3.2:3b"},
}
```

에이전트 코드에서 모델명을 하드코딩하지 않고 항상 `MODEL_CONFIG[agent_name]`을 참조한다.

## Ollama 연동 패턴

```python
import httpx

OLLAMA_BASE = "http://localhost:11434"

async def call_ollama(agent_name: str, messages: list) -> str:
    config = MODEL_CONFIG[agent_name]
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/chat",
                json={"model": config["model"], "messages": messages, "stream": False}
            )
            return resp.json()["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="로컬 모델 오프라인")
```

## 에이전트 함수 시그니처

모든 에이전트는 동일한 시그니처를 따른다:

```python
async def run_judge(messages: list, context: dict) -> str:
    # messages: 대화 히스토리
    # context: {"situation": str, "history": list, "question_count": int, "hints_used": int}
    system_prompt = build_judge_prompt(context)
    payload = [{"role": "system", "content": system_prompt}] + messages
    
    result = await call_ollama("judge", payload)
    
    # 파싱 실패 시 1회 재시도
    if result.strip() not in ["예", "아니오", "관련없음"]:
        result = await call_ollama("judge", payload)
    if result.strip() not in ["예", "아니오", "관련없음"]:
        result = "관련없음"  # fallback
    
    return result.strip()
```

## game_session 관리

```python
# in-memory, per request (세션 ID는 프론트엔드가 관리)
game_sessions: dict[str, dict] = {}

def get_session(session_id: str) -> dict:
    return game_sessions.get(session_id, {
        "story_id": None,
        "situation": "",
        "question_count": 0,
        "hints_used": 0,
        "is_solved": False,
        "history": []
    })
```

## 라우터 패턴

```python
# backend/routers/game.py
@router.post("/turn")
async def game_turn(body: TurnRequest):
    session = get_session(body.session_id)
    context = {
        "situation": session["situation"],
        "history": session["history"],
        "question_count": session["question_count"],
        "hints_used": session["hints_used"],
    }
    
    judge_result = await run_judge(body.messages, context)
    host_response = await run_host(body.messages, context, judge_result)
    
    hint_response = None
    if session["question_count"] % 5 == 0 or body.request_hint:
        hint_response = await run_hint(body.messages, context)
    
    # 히스토리 업데이트
    session["history"].append({"role": "user", "content": body.user_message})
    session["history"].append({"role": "assistant", "agent": "host", "content": host_response})
    session["question_count"] += 1
    
    return {
        "judge": judge_result,
        "host": host_response,
        "hint": hint_response,  # None이면 프론트에서 표시 안 함
    }
```

## 파일 I/O 패턴

```python
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

def load_stories() -> list:
    with open(DATA_DIR / "stories.json", encoding="utf-8") as f:
        return json.load(f)

def strip_truth(story: dict) -> dict:
    s = story.copy()
    s.pop("truth", None)
    s.pop("answer_keywords", None)
    return s
```
