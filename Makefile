.PHONY: help setup up down status logs build check gcp-plan gcp-deploy

PYTHON ?= python
ENV ?= dev

help:
	@echo "OpsGraph: setup | up | down | status | logs | build | check | gcp-plan | gcp-deploy ENV=dev"

ifeq ($(OS),Windows_NT)
setup:
	powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
check:
	powershell -ExecutionPolicy Bypass -File scripts/check.ps1
else
setup:
	sh scripts/setup.sh
check:
	sh scripts/check.sh
endif

up:
	docker compose up -d --build

down:
	docker compose down

status:
	docker compose ps

logs:
	docker compose logs --tail 100 -f

build:
	docker compose build

gcp-plan:
	$(PYTHON) scripts/deploy_gcp.py --env $(ENV)

gcp-deploy:
	$(PYTHON) scripts/deploy_gcp.py --env $(ENV) --apply
