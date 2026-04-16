import json
import re
import httpx
from fastapi import HTTPException
from config.models import MODEL_CONFIG

OLLAMA_BASE = "http://localhost:11434"

JUDGE_SYSTEM_PROMPT = """당신은 거북이 수프 게임의 심판입니다. 반드시 한국어로만 답하세요.

[공개 상황]
{situation}

[비공개 정답 - 판정에만 사용, 응답에 노출 금지]
{truth}

플레이어의 발화를 다음 절차로 분석하세요.

1) 발화 유형 분류 (utterance_type)
   - 질문: "...인가요?", "...있나요?", "...나?" 처럼 yes/no 를 묻는 형태.
   - 선언: 평서·서술 형태로 자신이 추리한 원인·상황을 주장.
   - 메타: "정답", "맞아?", "내가 풀었어", "정답인가요?" 처럼 맞고 틀림만 따지고 내용이 없는 발화. 선언이 아님.

2) 정답과 발화 비교
   - 질문: 질문이 가정하는 사실이 정답·상황과 일치하는지, 모순되는지, 전혀 무관한지 판단.
   - 선언: 선언 내용이 정답의 핵심 원인과 일치하는지 판단. 세부까지 다 맞을 필요는 없고, 핵심 원인이 올바르면 일치로 본다.
   - 메타: 비교 대상 없음.

3) 판정(verdict)
   - 질문이고 일치 → 예
   - 질문이고 모순 → 아니오
   - 질문이고 무관 → 관련없음
   - 선언이고 핵심 원인 일치 → 정답
   - 선언이고 불일치 → 아니오
   - 메타 → 관련없음
   - 애매하면 관련없음 대신 예/아니오 중 하나를 고를 것.

출력은 반드시 아래 JSON 객체 하나만. 추가 텍스트, 코드블록, 주석 금지.
{{
  "utterance_type": "질문" 또는 "선언" 또는 "메타",
  "reasoning": "한두 문장의 한국어 추론",
  "verdict": "예" 또는 "아니오" 또는 "관련없음" 또는 "정답"
}}"""

VALID_RESPONSES = ("정답", "관련없음", "아니오", "예")
VALID_UTTERANCE_TYPES = ("질문", "선언", "메타")


async def call_ollama(agent_name: str, messages: list) -> str:
    config = MODEL_CONFIG[agent_name]
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/chat",
                json={
                    "model": config["model"],
                    "messages": messages,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.0,
                        "top_p": 0.9,
                        "num_predict": 256,
                    },
                },
            )
            data = resp.json()
            if "message" not in data:
                error_detail = data.get("error", str(data))
                raise HTTPException(status_code=502, detail=f"Ollama 응답 오류: {error_detail}")
            return data["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="로컬 모델 오프라인")


_POSITIVE_VARIANTS = ("네", "맞", "그렇")
_NEGATIVE_VARIANTS = ("아니요", "아닙", "틀")


def _parse_judge_response(raw: str) -> str | None:
    """Return one of 정답/관련없음/아니오/예, or None if parsing fails.

    Priority:
    1) JSON parse → extract `verdict`, coerce self-contradictions
       (verdict="정답" but utterance_type≠"선언" → "관련없음").
    2) Hangul-only substring match (longest-first) as salvage.
    3) Korean positive/negative variants as last resort.
    """
    try:
        obj = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        obj = None

    if isinstance(obj, dict):
        verdict = obj.get("verdict")
        utterance_type = obj.get("utterance_type")
        if verdict in VALID_RESPONSES:
            if verdict == "정답" and utterance_type != "선언":
                return "관련없음"
            return verdict

    hangul_only = re.sub(r"[^\uAC00-\uD7A3]", "", raw)
    for valid in VALID_RESPONSES:
        if valid in hangul_only:
            return valid

    for variant in _NEGATIVE_VARIANTS:
        if variant in hangul_only:
            return "아니오"
    for variant in _POSITIVE_VARIANTS:
        if variant in hangul_only:
            return "예"
    return None


async def run_judge(messages: list, context: dict) -> str:
    situation = context.get("situation", "")
    truth = context.get("truth", "")

    system_prompt = JUDGE_SYSTEM_PROMPT.format(
        situation=situation,
        truth=truth,
    )

    ollama_messages = [{"role": "system", "content": system_prompt}] + messages

    raw = await call_ollama("judge", ollama_messages)
    result = _parse_judge_response(raw)

    if result is None:
        raw = await call_ollama("judge", ollama_messages)
        result = _parse_judge_response(raw)

    return result if result is not None else "관련없음"
