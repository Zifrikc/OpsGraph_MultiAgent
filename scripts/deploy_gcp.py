"""Explicit, demo-scoped Cloud Run deployment for the two application images.

The default mode only prints a plan. --apply builds images and deploys services.
FalkorDB and Secret Manager resources must already exist.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def read_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise SystemExit(f"Missing {path.name}; copy its .example template first.")
    values: dict[str, str] = {}
    for number, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise SystemExit(f"Invalid {path.name}:{number}: expected NAME=value")
        key, value = line.split("=", 1)
        if not key.isidentifier():
            raise SystemExit(f"Invalid variable name in {path.name}:{number}")
        values[key] = value.strip()
    return values


def required(values: dict[str, str], keys: tuple[str, ...], file_name: str) -> None:
    missing = [
        key
        for key in keys
        if not values.get(key) or "REPLACE_WITH" in values[key]
    ]
    if missing:
        raise SystemExit(f"Complete {file_name}: {', '.join(missing)}")


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def service_url(project: str, region: str, service: str) -> str:
    result = subprocess.run(
        [
            "gcloud", "run", "services", "describe", service,
            "--project", project, "--region", region,
            "--format=value(status.url)",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    url = result.stdout.strip()
    if not url.startswith("https://"):
        raise SystemExit(f"Cloud Run did not return an HTTPS URL for {service}")
    return url


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", choices=("dev", "qa", "prod"), default="dev")
    parser.add_argument("--apply", action="store_true", help="Build and deploy; otherwise plan only")
    args = parser.parse_args()

    deploy_path = ROOT / f".env.deploy.{args.env}"
    runtime_path = ROOT / f".env.cloudrun.{args.env}"
    deploy = read_env(deploy_path)
    runtime = read_env(runtime_path)
    required(
        deploy,
        (
            "GCP_PROJECT_ID", "GCP_REGION", "GCP_ARTIFACT_REPO",
            "GCP_API_SERVICE", "GCP_WEB_SERVICE", "GCP_API_SERVICE_ACCOUNT",
            "GCP_WEB_SERVICE_ACCOUNT", "GCP_IMAGE_TAG", "SECRET_FALKORDB_PASSWORD",
            "SECRET_API_TOKEN", "SECRET_AUTH_SECRET", "SECRET_ADMIN_PASSWORD",
            "SECRET_OPERATOR_PASSWORD", "SECRET_VIEWER_PASSWORD",
        ),
        deploy_path.name,
    )
    required(
        runtime,
        (
            "FALKORDB_HOST", "FALKORDB_PORT", "FALKORDB_USERNAME",
            "FALKORDB_SSL", "FALKORDB_GRAPH", "MODEL_PROVIDER", "MODEL_NAME",
        ),
        runtime_path.name,
    )
    if runtime["MODEL_PROVIDER"] not in {"none", "google"}:
        raise SystemExit("Cloud Run template supports MODEL_PROVIDER=none or google only.")
    if runtime["MODEL_PROVIDER"] == "google":
        required(deploy, ("SECRET_GOOGLE_API_KEY",), deploy_path.name)

    project, region = deploy["GCP_PROJECT_ID"], deploy["GCP_REGION"]
    registry = f"{region}-docker.pkg.dev/{project}/{deploy['GCP_ARTIFACT_REPO']}"
    api_image = f"{registry}/opsgraph-api:{deploy['GCP_IMAGE_TAG']}"
    web_image = f"{registry}/opsgraph-web:{deploy['GCP_IMAGE_TAG']}"
    print(f"Environment: {args.env}; project: {project}; region: {region}")
    print(f"Build: {api_image} and {web_image}")
    print(f"Deploy: {deploy['GCP_API_SERVICE']} then {deploy['GCP_WEB_SERVICE']}")
    print("Prerequisites: external reachable FalkorDB, Artifact Registry repository,")
    print("service accounts, Secret Manager secrets and IAM access already configured.")
    print("Demo services allow public invocation; API still requires its app token/JWT.")
    if not args.apply:
        print("Plan only. Pass --apply to make cloud changes.")
        return
    if shutil.which("gcloud") is None:
        raise SystemExit("Install and authenticate the Google Cloud CLI first.")

    run(
        "gcloud", "builds", "submit", ".", "--config=cloudbuild.yaml",
        f"--project={project}", f"--region={region}",
        "--substitutions="
        f"_REGION={region},_REPOSITORY={deploy['GCP_ARTIFACT_REPO']},"
        f"_TAG={deploy['GCP_IMAGE_TAG']}",
    )
    api_vars = ",".join(
        f"{key}={runtime[key]}"
        for key in (
            "FALKORDB_HOST", "FALKORDB_PORT", "FALKORDB_USERNAME",
            "FALKORDB_SSL", "FALKORDB_GRAPH", "MODEL_PROVIDER", "MODEL_NAME",
        )
    )
    if runtime.get("MODEL_TIMEOUT_SECONDS"):
        api_vars += f",MODEL_TIMEOUT_SECONDS={runtime['MODEL_TIMEOUT_SECONDS']}"
    api_secrets = ",".join(
        f"{setting}={deploy[secret]}:latest"
        for setting, secret in (
            ("FALKORDB_PASSWORD", "SECRET_FALKORDB_PASSWORD"),
            ("API_TOKEN", "SECRET_API_TOKEN"),
            ("AUTH_SECRET", "SECRET_AUTH_SECRET"),
            ("ADMIN_PASSWORD", "SECRET_ADMIN_PASSWORD"),
            ("OPERATOR_PASSWORD", "SECRET_OPERATOR_PASSWORD"),
            ("VIEWER_PASSWORD", "SECRET_VIEWER_PASSWORD"),
        )
    )
    if runtime["MODEL_PROVIDER"] == "google":
        api_secrets += f",GOOGLE_API_KEY={deploy['SECRET_GOOGLE_API_KEY']}:latest"
    api_command = [
        "gcloud", "run", "deploy", deploy["GCP_API_SERVICE"],
        "--image", api_image, "--project", project, "--region", region,
        "--platform=managed", "--allow-unauthenticated", "--max-instances=1",
        "--concurrency=1", "--memory=1Gi", "--timeout=600",
        "--service-account", deploy["GCP_API_SERVICE_ACCOUNT"],
        "--set-env-vars", api_vars, "--set-secrets", api_secrets,
    ]
    if deploy.get("GCP_VPC_CONNECTOR"):
        api_command.extend(("--vpc-connector", deploy["GCP_VPC_CONNECTOR"]))
    run(*api_command)
    api_url = service_url(project, region, deploy["GCP_API_SERVICE"])
    run(
        "gcloud", "run", "deploy", deploy["GCP_WEB_SERVICE"],
        "--image", web_image, "--project", project, "--region", region,
        "--platform=managed", "--allow-unauthenticated", "--max-instances=1",
        "--memory=1Gi", "--timeout=600",
        "--service-account", deploy["GCP_WEB_SERVICE_ACCOUNT"],
        "--set-env-vars", f"API_BASE_URL={api_url},APP_ORIGIN=https://example.invalid",
        "--set-secrets", f"API_TOKEN={deploy['SECRET_API_TOKEN']}:latest",
    )
    web_url = service_url(project, region, deploy["GCP_WEB_SERVICE"])
    run(
        "gcloud", "run", "services", "update", deploy["GCP_WEB_SERVICE"],
        "--project", project, "--region", region,
        "--update-env-vars", f"APP_ORIGIN={web_url}",
    )
    print(f"Web URL: {web_url}")
    print("Check login, graph connectivity, model status, and an end-to-end mock payment.")


if __name__ == "__main__":
    main()
