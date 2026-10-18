from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    session_id: UUID
    product: Literal[0, 1, 2] = 0
    scenario: Literal["healthy", "timeout", "deployment"]


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
