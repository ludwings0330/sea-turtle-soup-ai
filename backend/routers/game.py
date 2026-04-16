import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.judge import run_judge

router = APIRouter()

# In-memory session store
sessions: dict[str, dict] = {}

STORIES_PATH = Path(__file__).parent.parent / "data" / "stories.json"


def _load_stories() -> list[dict]:
    with open(STORIES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _strip_private_fields(story: dict) -> dict:
    """truth와 answer_keywords를 제거한 스토리 반환 (frontend 전송용)."""
    s = story.copy()
    s.pop("truth", None)
    s.pop("answer_keywords", None)
    return s


# --- Request / Response models ---

class StartRequest(BaseModel):
    story_id: str


class StartResponse(BaseModel):
    session_id: str
    story_id: str
    title: str
    difficulty: str
    situation: str


class TurnRequest(BaseModel):
    session_id: str
    user_message: str


class TurnResponse(BaseModel):
    judge: str
    question_count: int
    is_solved: bool


class EndRequest(BaseModel):
    session_id: str


class EndResponse(BaseModel):
    session_id: str
    question_count: int
    hints_used: int
    is_solved: bool


# --- Endpoints ---

@router.get("/stories")
async def list_stories() -> list[dict]:
    """stories.json 로드 후 truth / answer_keywords 제거하여 반환."""
    stories = _load_stories()
    return [_strip_private_fields(s) for s in stories]


@router.post("/game/start", response_model=StartResponse)
async def start_game(req: StartRequest) -> StartResponse:
    stories = _load_stories()
    story = next((s for s in stories if s["id"] == req.story_id), None)

    if story is None:
        raise HTTPException(status_code=404, detail=f"story_id '{req.story_id}' 를 찾을 수 없습니다.")

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "story_id": story["id"],
        "situation": story["situation"],
        "truth": story["truth"],               # backend 전용
        "answer_keywords": story.get("answer_keywords", []),  # backend 전용
        "question_count": 0,
        "hints_used": 0,
        "is_solved": False,
        "history": [],
    }

    return StartResponse(
        session_id=session_id,
        story_id=story["id"],
        title=story["title"],
        difficulty=story["difficulty"],
        situation=story["situation"],
    )


@router.post("/game/turn", response_model=TurnResponse)
async def game_turn(req: TurnRequest) -> TurnResponse:
    session = sessions.get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    if session["is_solved"]:
        raise HTTPException(status_code=400, detail="이미 해결된 게임입니다.")

    # 히스토리에 유저 메시지 추가
    session["history"].append({"role": "user", "content": req.user_message})
    session["question_count"] += 1

    # judge 호출 컨텍스트 (truth / answer_keywords 포함, backend 전용)
    judge_context = {
        "situation": session["situation"],
        "truth": session["truth"],
        "answer_keywords": session["answer_keywords"],
    }
    judge_messages = [{"role": "user", "content": req.user_message}]
    judge_result = await run_judge(judge_messages, judge_context)

    is_solved = (judge_result == "정답")
    session["is_solved"] = is_solved

    # 히스토리에 judge 결과 추가
    session["history"].append({
        "role": "assistant",
        "agent": "judge",
        "content": judge_result,
    })

    return TurnResponse(
        judge=judge_result,
        question_count=session["question_count"],
        is_solved=is_solved,
    )


@router.post("/game/end", response_model=EndResponse)
async def end_game(req: EndRequest) -> EndResponse:
    session = sessions.get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    # 세션 종료 마킹
    session["is_solved"] = True

    return EndResponse(
        session_id=req.session_id,
        question_count=session["question_count"],
        hints_used=session["hints_used"],
        is_solved=session["is_solved"],
    )
