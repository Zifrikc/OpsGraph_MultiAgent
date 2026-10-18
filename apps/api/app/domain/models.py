from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModelChoice(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: Literal["default", "ollama", "google", "anthropic", "openai"] = "default"
    model: str = Field(default="", max_length=100, pattern=r"^[a-zA-Z0-9._:/-]*$")
    api_key: str = Field(default="", max_length=300)


class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    session_id: UUID
    product: Literal[0, 1, 2] = 0
    scenario: Literal["healthy", "timeout", "deployment"]
    store_id: str = Field(default="store-centro", pattern=r"^store-(centro|norte|sur|[0-9]{2})$")
    model_choice: ModelChoice = Field(default_factory=ModelChoice)


class ChatRequest(BaseModel):
    session_id: UUID
    question: str = Field(min_length=4, max_length=500)
    model_choice: ModelChoice = Field(default_factory=ModelChoice)


class BatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: UUID
    model_choice: ModelChoice = Field(default_factory=ModelChoice)


class ActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: UUID
    action: Literal["simulate_recovery"]


class ToolPlan(BaseModel):
    tools: list[str] = Field(max_length=5)


class Summary(BaseModel):
    summary: str = Field(max_length=1600)
    evidence_refs: list[str] = Field(max_length=20)
    uncertainties: list[str] = Field(max_length=5)
