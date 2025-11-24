# Demo Workshop Makefile
# Simplified commands for building and deploying the ride sharing workshop

.PHONY: help build deploy clean destroy diff synth bootstrap logs install

# Default target
help: ## Show this help message
	@echo "Powertools for AWS Lambda Workshop"
	@echo "==========================================="
	@echo ""
	@echo "Available commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Examples:"
	@echo "  make build                    # Build all services"
	@echo "  make deploy-infra            # Deploy infrastructure only"
	@echo "  make deploy-services         # Deploy services only"
	@echo "  make deploy-dotnet           # Deploy .NET services"

# Variables
SCRIPTS_DIR = ./scripts

install: ## Install infrastructure dependencies
	@echo "📦 Installing infrastructure dependencies..."
	@cd infrastructure && npm install
	@echo "✅ Dependencies installed!"

build-dotnet: ## Build .NET services only
	@bash $(SCRIPTS_DIR)/build.sh dotnet

build-java: ## Build Java services only
	@bash $(SCRIPTS_DIR)/build.sh java

deploy-infra: ## Deploy infrastructure only
	@bash $(SCRIPTS_DIR)/deploy.sh infrastructure

deploy-ide: ## Deploy IDE stack only (use GIT_REPO_URL=<url> to specify custom repository)
	@GIT_REPO_URL=$(GIT_REPO_URL) bash $(SCRIPTS_DIR)/deploy.sh ide

check-ide-status: ## Check IDE instance and VSCode server status
	@bash $(SCRIPTS_DIR)/check-ide-status.sh

deploy-dotnet: ## Deploy .NET services only
	@bash $(SCRIPTS_DIR)/deploy.sh services dotnet

deploy-java: ## Deploy Java services only
	@bash $(SCRIPTS_DIR)/deploy.sh services java

deploy-python: ## Deploy Python services only
	@bash $(SCRIPTS_DIR)/deploy.sh services python

deploy-typescript: ## Deploy TypeScript services only
	@bash $(SCRIPTS_DIR)/deploy.sh services typescript

deploy-load-generator: ## Deploy Load generator stack
	@bash $(SCRIPTS_DIR)/deploy.sh load-generator

convert: ## Synthesize then convert all stacks produced by synth (mirrors synth behavior)
	@echo "Preparing to synth + convert all stacks"
	@echo "🔨 Building TypeScript services first..."
	@bash $(SCRIPTS_DIR)/build.sh typescript
	@echo "🐳 Building load generator Docker image..."
	@bash $(SCRIPTS_DIR)/build-load-generator.sh
	@$(MAKE) synth
	@echo "Converting powertoolsworkshopinfra"
	@node scripts/convert-template.mjs powertoolsworkshopinfra
	@echo "Converting powertoolsworkshopservices"
	@node scripts/convert-template.mjs powertoolsworkshopservices
	@echo "Converting powertoolsworkshopide"
	@node scripts/convert-template.mjs powertoolsworkshopide
	@echo "Converting powertoolsworkshopload"
	@node scripts/convert-template.mjs powertoolsworkshopload

check-load-generator: ## Check status of running Load Generators
	@bash $(SCRIPTS_DIR)/check-load-generator-status.sh

truncate-tables: ## Deploy with fresh tables (DELETES ALL DATA)
	@bash $(SCRIPTS_DIR)/truncate-tables.sh

destroy-ide: ## Destroy IDE stack only
	@echo "🗑️  Destroying IDE stack..."
	@cd infrastructure && npx cdk destroy powertoolsworkshopide --force
	@echo "✅ IDE stack destroyed!"

destroy-load-generator: ## Destroy Load generator stack only
	@echo "🗑️  Destroying Load generator stack..."
	@cd infrastructure && npx cdk destroy powertoolsworkshopload --force
	@echo "✅ Load generator stack destroyed!"

destroy: ## Destroy all infrastructure stacks
	@echo "💥 Destroying all infrastructure..."
	@echo "🗑️  Deleting Load generator stack first..."
	@aws cloudformation delete-stack --stack-name powertoolsworkshopload 2>/dev/null || true
	@aws cloudformation wait stack-delete-complete --stack-name powertoolsworkshopload 2>/dev/null || true
	@echo "🗑️  Deleting IDE stack..."
	@aws cloudformation delete-stack --stack-name powertoolsworkshopide 2>/dev/null || true
	@aws cloudformation wait stack-delete-complete --stack-name powertoolsworkshopide 2>/dev/null || true
	@echo "🗑️  Deleting services stack..."
	@aws cloudformation delete-stack --stack-name powertoolsworkshopservices
	@aws cloudformation wait stack-delete-complete --stack-name powertoolsworkshopservices
	@echo "🗑️  Deleting infrastructure stack..."
	@aws cloudformation delete-stack --stack-name powertoolsworkshopinfra
	@aws cloudformation wait stack-delete-complete --stack-name powertoolsworkshopinfra
	@echo "✅ All stacks destroyed!"

synth: ## Synthesize CloudFormation template
	@echo "📝 Synthesizing CloudFormation templates..."
	@(cd infrastructure && npx cdk synth powertoolsworkshopinfra --context deploymentType=infrastructure)
	@(cd infrastructure && npx cdk synth powertoolsworkshopservices --context deploymentType=services --context language=typescript)
	@(cd infrastructure && npx cdk synth powertoolsworkshopide --context deploymentType=ide)
	@(cd infrastructure && npx cdk synth powertoolsworkshopload --context deploymentType=load-generator)
	@mkdir -p Workshop/static/cfn
	@cp infrastructure/cdk.out/powertoolsworkshopinfra.template.json Workshop/static/cfn/powertoolsworkshopinfra.json
	@cp infrastructure/cdk.out/powertoolsworkshopservices.template.json Workshop/static/cfn/powertoolsworkshopservices.json
	@cp infrastructure/cdk.out/powertoolsworkshopide.template.json Workshop/static/cfn/powertoolsworkshopide.json
	@cp infrastructure/cdk.out/powertoolsworkshopload.template.json Workshop/static/cfn/powertoolsworkshopload.json
	@echo "✅ Templates copied to Workshop/static/cfn/"

bootstrap: ## Bootstrap CDK (run once per account/region)
	@echo "🚀 Bootstrapping CDK..."
	@cd infrastructure && cdk bootstrap
