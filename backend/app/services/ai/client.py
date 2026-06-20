"""Abstract AI client — same interface for Ollama and Azure OpenAI."""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AIMessage:
    role: str   # "system" | "user" | "assistant"
    content: str


@dataclass
class AIResponse:
    content: str
    model: str
    prompt_tokens: int
    completion_tokens: int


class AIClient(ABC):
    @abstractmethod
    async def chat(self, messages: list[AIMessage], temperature: float = 0.1) -> AIResponse:
        """Send a chat completion request and return the response."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the AI backend is reachable."""
        ...


def get_ai_client() -> AIClient:
    from app.core.config import settings

    if settings.ai_provider == "ollama":
        from app.services.ai.ollama import OllamaClient
        return OllamaClient()
    elif settings.ai_provider == "azure_openai":
        from app.services.ai.azure_openai import AzureOpenAIClient
        return AzureOpenAIClient()
    else:
        raise ValueError(f"Unknown AI provider: {settings.ai_provider}")
