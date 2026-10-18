import json
import os
import sys
import unicodedata

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app.domain.models import Summary
from app.infrastructure.graph import GraphRepository
from app.infrastructure.models import ModelGateway


class ChatWorkflow:
    def __init__(self, choice=None):
        self.repo = GraphRepository()
        self.model = ModelGateway(choice)

    async def answer(self, session_id: str, question: str):
        snapshot = self.repo.snapshot(session_id)
        chunks = self.repo.runbook_chunks(question)
        refs = [chunk["ref"] for chunk in chunks]
        evidence = {"runbooks": chunks, "phase": snapshot["phase"], "incident": None}
        incident = snapshot.get("incident")
        if incident:
            evidence["incident"] = {
                "id": incident["id"],
                "status": incident["status"],
                "summary": incident["summary"],
                "provider_status": incident["provider_status"],
            }
            # The same allowlisted graph tools used by the investigation back the chat.
            server = StdioServerParameters(
                command=sys.executable,
                args=["-m", "app.presentation.mcp.server"],
                env=dict(os.environ),
            )
            async with (
                stdio_client(server) as (read, write),
                ClientSession(read, write) as mcp,
            ):
                await mcp.initialize()
                for name, args in [
                    ("calculate_blast_radius", {"service_id": "bank-connector"}),
                    ("find_applicable_runbooks", {"service_id": "bank-connector"}),
                ]:
                    result = await mcp.call_tool(name, args)
                    if result.isError:
                        continue
                    data = result.structuredContent
                    if data is None:
                        data = json.loads(next(c.text for c in result.content if c.type == "text"))
                    evidence[name] = data
                    if data.get("ref"):
                        refs.append(data["ref"])
        history = self.repo.chat_history(session_id)
        instruction = (
            "Responde en español a la pregunta del administrador sobre esta demo de operaciones. "
            "Usa solo evidencia suministrada, no inventes eventos ni afirmes pagos reales. "
            "Responde exactamente a la intención: capacidades, diagnóstico o pasos de recuperación. "
            "El chat es de consulta; no puede aprobar ni ejecutar la recuperación. "
            "Si piden resolver, indica que el administrador debe abrir Observability, revisar RB-007 "
            "y aprobar la recuperación simulada; el agente validará el runbook mediante MCP. "
            "Cita únicamente refs disponibles y expresa incertidumbre. Devuelve JSON con "
            "summary, evidence_refs y uncertainties."
        )
        generated, mode = await self.model.generate(
            instruction,
            {
                "question": question,
                "history": history[-3:],
                "evidence": evidence,
                "allowed_refs": refs,
            },
            Summary,
        )
        if (
            not generated
            or not set(generated.evidence_refs).issubset(refs)
            or not generated.evidence_refs
        ):
            phase = snapshot["phase"]
            normalized = "".join(
                char
                for char in unicodedata.normalize("NFKD", question.casefold())
                if not unicodedata.combining(char)
            )
            if any(
                term in normalized
                for term in ("funcion", "puedes hacer", "que haces", "capacidades")
            ):
                answer = (
                    "Puedo consultar el grafo de FalkorDB mediante herramientas MCP, mostrar la ruta de impacto "
                    "y el runbook RB-007, y explicar la evidencia del incidente con sus fuentes. "
                    "También puedo indicar si respondió el modelo o la ruta determinista. "
                    "Desde este chat no ejecuto cambios: la recuperación se aprueba en Observability."
                )
            elif any(
                term in normalized for term in ("resolv", "solucion", "arregl", "mitig", "recuper")
            ):
                if incident and incident["status"] == "open":
                    answer = (
                        f"El incidente {incident['id'][:8]} sigue abierto. Abre Observability → Investigation, "
                        "revisa la ruta afectada y RB-007, y pulsa ‘Validate with agent and recover’. "
                        "El agente volverá a consultar el runbook por MCP antes de registrar una recuperación "
                        "simulada. El pago fallido no se reintenta ni se aprueba."
                    )
                elif incident and incident["status"] == "resolved":
                    answer = (
                        f"El incidente {incident['id'][:8]} ya está resuelto en la demo. "
                        "Revisa el evento incident.resolved y el paso recovery-agent en Observability. "
                        "El pago fallido permanece sin aprobar."
                    )
                else:
                    answer = "No hay un incidente abierto en esta sesión. Inicia un timeout de prueba y revisa Observability."
            elif incident:
                affected = evidence.get("calculate_blast_radius", {}).get("affected", [])
                impact = ", ".join(affected[:6]) if affected else "la ruta de pagos"
                answer = (
                    f"El incidente {incident['id'][:8]} está en estado {incident['status']}. "
                    f"El grafo señala {impact}. RB-007 documenta una recuperación simulada; "
                    "consulta la ruta y los eventos en Observability para verificar el impacto."
                )
            else:
                answer = (
                    f"Esta sesión está en estado {phase}. No hay un incidente activo con evidencia "
                    "para atribuir una causa. El runbook describe cómo investigar un timeout bancario."
                )
            generated = Summary(
                summary=answer,
                evidence_refs=refs[:3],
                uncertainties=["Datos de demostración; la respuesta no prueba causalidad."],
            )
            mode = "deterministic_fallback:" + mode
        self.repo.save_chat(session_id, question, generated.summary, generated.evidence_refs, mode)
        return {
            "answer": generated.summary,
            "evidence_refs": generated.evidence_refs,
            "uncertainties": generated.uncertainties,
            "provider_status": mode,
            "model": self.model.selected()[1],
            "history": self.repo.chat_history(session_id),
        }
