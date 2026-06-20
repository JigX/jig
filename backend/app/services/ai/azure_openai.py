from openai import AsyncAzureOpenAI

from app.core.config import settings
from app.services.ai.client import AIClient, AIMessage, AIResponse


class AzureOpenAIClient(AIClient):
    def __init__(self) -> None:
        self._client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
        )
        self.deployment = settings.azure_openai_deployment

    async def chat(self, messages: list[AIMessage], temperature: float = 0.1) -> AIResponse:
        response = await self._client.chat.completions.create(
            model=self.deployment,
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
            return len(models.data) >= 0
        except Exception:
            return False
