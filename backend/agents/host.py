import httpx
from fastapi import HTTPException
from config.models import MODEL_CONFIG

OLLAMA_BASE = "http://localhost:11434"

HOST_SYSTEM_PROMPT = """당신은 거북이 수프 게임의 진행자입니다.

[공개 상황]
{situation}

[심판 판정 결과]
{judge_result}

규칙:
1. 심판 판정 결과를 바탕으로 플레이어에게 자연스럽고 친절하게 응답하세요.
2. 판정이 "예"면 긍정적으로, "아니오"면 부정적으로, "관련없음"이면 힌트 없이 무관함을 알려주세요.
3. 1~2문장으로 간결하게 답하세요.
4. 정답(truth)이나 비공개 정보를 절대 노출하지 마세요.
5. 플레이어가 계속 추리할 수 있도록 격려하는 톤을 유지하세요."""


async def call_ollama(agent_name: str, messages: list) -> str:
    config = MODEL_CONFIG[agent_name]
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/chat",
                json={"model": config["model"], "messages": messages, "stream": False},
            )
            data = resp.json()
            if "message" not in data:
                error_detail = data.get("error", str(data))
                raise HTTPException(status_code=502, detail=f"Ollama 응답 오류: {error_detail}")
            return data["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="로컬 모델 오프라인")


def _fallback_host_response(judge_result: str) -> str:
    if judge_result == "예":
        return "네, 맞습니다!"
    elif judge_result == "아니오":
        return "아니오, 그렇지 않습니다."
    else:
        return "그 질문은 이 수수께끼와 관련이 없습니다."


async def run_host(messages: list, context: dict) -> str:
    situation = context.get("situation", "")
    judge_result = context.get("judge_result", "관련없음")

    system_prompt = HOST_SYSTEM_PROMPT.format(
        situation=situation,
        judge_result=judge_result,
    )

    ollama_messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        raw = await call_ollama("host", ollama_messages)
        if raw and raw.strip():
            return raw.strip()

        # Retry once if empty response
        raw = await call_ollama("host", ollama_messages)
        if raw and raw.strip():
            return raw.strip()
    except HTTPException:
        raise

    return _fallback_host_response(judge_result)
