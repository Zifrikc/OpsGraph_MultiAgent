from mcp.server.fastmcp import FastMCP
from app.infrastructure.graph import GraphRepository

mcp = FastMCP("opsgraph-domain")


@mcp.tool()
def calculate_blast_radius(service_id: str = "bank-connector") -> dict:
    """Return dependents and evidence paths, bounded to four hops and 30 paths."""
    rows = GraphRepository().query(
        "MATCH p=(s:Service)-[:DEPENDS_ON*0..4]->(origin:Service {id:$id}) "
        "RETURN s.id,[n IN nodes(p) | n.id] LIMIT 30",
        {"id": service_id},
        True,
    )
    return {
        "affected": sorted(set(r[0] for r in rows)),
        "paths": [r[1] for r in rows],
        "ref": "graph:impact:" + service_id,
    }


@mcp.tool()
def get_owners(service_id: str = "bank-connector") -> dict:
    """Find the responsible team from the graph."""
    rows = GraphRepository().query(
        "MATCH (:Service {id:$id})-[:OWNED_BY]->(t:Team) RETURN t.name LIMIT 5",
        {"id": service_id},
        True,
    )
    return {"owners": [r[0] for r in rows], "ref": "graph:owners:" + service_id}


@mcp.tool()
def get_recent_deployments(incident_id: str) -> dict:
    """Find deployments linked to this incident; correlation is not causation."""
    rows = GraphRepository().query(
        "MATCH (:Incident {id:$id})-[:CORRELATED_WITH]->(d:Deployment) "
        "RETURN d.id,d.minutesBefore LIMIT 5",
        {"id": incident_id},
        True,
    )
    return {
        "deployments": [{"id": r[0], "minutesBefore": r[1]} for r in rows],
        "causality": "unproven",
        "ref": "graph:deployments:" + incident_id,
    }


@mcp.tool()
def find_similar_incidents(service_id: str = "bank-connector") -> dict:
    """Read curated historical incidents for the affected service."""
    rows = GraphRepository().query(
        "MATCH (h:HistoricalIncident)-[:AFFECTED]->(:Service {id:$id}) "
        "RETURN h.id,h.summary LIMIT 5",
        {"id": service_id},
        True,
    )
    return {
        "incidents": [{"id": r[0], "summary": r[1]} for r in rows],
        "ref": "graph:history:" + service_id,
    }


@mcp.tool()
def find_applicable_runbooks(service_id: str = "bank-connector") -> dict:
    """Read runbooks. Does not perform any remediation."""
    rows = GraphRepository().query(
        "MATCH (:Service {id:$id})-[:HAS_RUNBOOK]->(r:Runbook) "
        "RETURN r.id,r.title,r.action LIMIT 5",
        {"id": service_id},
        True,
    )
    return {
        "runbooks": [{"id": r[0], "title": r[1], "action": r[2]} for r in rows],
        "ref": "graph:runbooks:" + service_id,
    }


if __name__ == "__main__":
    mcp.run(transport="stdio")
