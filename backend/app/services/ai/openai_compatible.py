"""Client for any server that speaks the OpenAI chat completions API.

Gebruikt voor de lokale vLLM op de GPU-node, maar werkt net zo goed met
llama.cpp of LiteLLM. Verschilt van AzureOpenAIClient alleen in hoe de
verbinding wordt opgezet: een base_url in plaats van een Azure-endpoint
met deployment en api-version.
"""
from openai import AsyncOpenAI

from app.core.config import settings
from app.services.ai.client import AIClient, AIMessage, AIResponse


class OpenAICompatibleClient(AIClient):
    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            base_url=settings.openai_base_url,
            # vLLM controleert de sleutel niet, maar de client weigert een lege waarde.
            api_key=settings.openai_api_key or "not-used",
        )
        self.model = settings.openai_model

    async def chat(self, messages: list[AIMessage], temperature: float = 0.1) -> AIResponse:
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],  # type: ignore[list-item]
            temperature=temperature,
        )
        choice = response.choices[0]
        usage = response.usage

        return AIResponse(
            content=choice.message.content or "",
            model=response.model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
        )

    async def health_check(self) -> bool:
        try:
            models = await self._client.models.list()
            return len(models.data) > 0
        except Exception:
            return False
