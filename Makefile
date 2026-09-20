.PHONY: install test demo run infra-up infra-down deploy

install:
	pip install -r requirements.txt

test:
	PYTHONPATH=src python3 -m pytest -q

demo:
	python3 scripts/run_demo.py

# Single-command local server: seeds sample patients and serves the API at
# http://localhost:8000. No Docker/Finch/AWS account needed to try this.
run:
	python3 scripts/local_server.py

# Menu-driven CLI a doctor can actually use - no curl, no JSON.
cli:
	python3 scripts/doctor_cli.py

# Build It track local infra (LocalStack + OpenSearch). Use `finch compose`
# if you don't have Docker; `docker compose` works identically.
infra-up:
	finch compose -f infra/docker-compose.yml up -d || docker compose -f infra/docker-compose.yml up -d

infra-down:
	finch compose -f infra/docker-compose.yml down || docker compose -f infra/docker-compose.yml down

# Deploy the SAM template to LocalStack. Requires: pip install aws-sam-cli-local
deploy:
	samlocal build -t infra/template.yaml
	samlocal deploy --template-file .aws-sam/build/template.yaml --stack-name adios --resolve-s3 --capabilities CAPABILITY_IAM
