import httpx

from app.core.config import settings
from app.services.ai.client import AIClient, AIMessage, AIResponse


class OllamaClient(AIClient):
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def chat(self, messages: list[AIMessage], temperature: float = 0.1) -> AIResponse:
        payload = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
            "options": {"temperature": temperature},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()

        return AIResponse(
            content=data["message"]["content"],
            model=data.get("model", self.model),
            prompt_tokens=data.get("prompt_eval_count", 0),
            completion_tokens=data.get("eval_count", 0),
        )

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/version")
                return resp.status_code == 200
        except Exception:
            return False
