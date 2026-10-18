import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
from app.domain.models import ToolPlan
from app.infrastructure.models import ModelGateway
import app.infrastructure.models as gateway_module


def test_model_disabled(monkeypatch):
    monkeypatch.setattr(
        gateway_module, "get_settings", lambda: SimpleNamespace(model_provider="none")
    )
    value, status = asyncio.run(ModelGateway().generate("", {}, ToolPlan))
    assert value is None and status == "deterministic"


def test_ollama_schema_and_failure_circuit(monkeypatch):
    import ollama

    settings = SimpleNamespace(
        model_provider="ollama",
        model_timeout_seconds=1,
        ollama_base_url="http://localhost:11434",
        model_name="fixture",
        model_max_output_tokens=100,
    )
    monkeypatch.setattr(gateway_module, "get_settings", lambda: settings)
    chat = AsyncMock(
        return_value=SimpleNamespace(message=SimpleNamespace(content='{"tools":["get_owners"]}'))
    )
    monkeypatch.setattr(ollama, "AsyncClient", lambda **kwargs: SimpleNamespace(chat=chat))
    model = ModelGateway()
    value, status = asyncio.run(model.generate("", {}, ToolPlan))
    assert status == "ollama" and value.tools == ["get_owners"]
    chat.side_effect = TimeoutError()
    assert asyncio.run(model.generate("", {}, ToolPlan))[1] == "timeout"
    assert asyncio.run(model.generate("", {}, ToolPlan))[1] == "prior_failure:timeout"
    assert chat.await_count == 2
