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
	@$(MAKE) synth
	@echo "Converting RiderWorkshopInfrastructureStack"
	@node scripts/convert-template.mjs RiderWorkshopInfrastructureStack
	@echo "Converting RiderWorkshopServicesStack"
	@node scripts/convert-template.mjs RiderWorkshopServicesStack
	@echo "Converting RiderWorkshopIdeStack"
	@node scripts/convert-template.mjs RiderWorkshopIdeStack
	@echo "Converting RiderWorkshopLoadGeneratorStack"
	@node scripts/convert-template.mjs RiderWorkshopLoadGeneratorStack

check-load-generator: ## Check status of running Load Generators
	@bash $(SCRIPTS_DIR)/check-load-generator-status.sh

truncate-tables: ## Deploy with fresh tables (DELETES ALL DATA)
	@bash $(SCRIPTS_DIR)/truncate-tables.sh

destroy-ide: ## Destroy IDE stack only
	@echo "🗑️  Destroying IDE stack..."
	@cd infrastructure && npx cdk destroy RiderWorkshopIdeStack --force
	@echo "✅ IDE stack destroyed!"

destroy-load-generator: ## Destroy Load generator stack only
	@echo "🗑️  Destroying Load generator stack..."
	@cd infrastructure && npx cdk destroy RiderWorkshopLoadGeneratorStack --force
	@echo "✅ Load generator stack destroyed!"

destroy: ## Destroy all infrastructure stacks
	@echo "💥 Destroying all infrastructure..."
	@echo "🗑️  Deleting Load generator stack first..."
	@aws cloudformation delete-stack --stack-name RiderWorkshopLoadGeneratorStack 2>/dev/null || true
	@aws cloudformation wait stack-delete-complete --stack-name RiderWorkshopLoadGeneratorStack 2>/dev/null || true
	@echo "🗑️  Deleting IDE stack..."
	@aws cloudformation delete-stack --stack-name RiderWorkshopIdeStack 2>/dev/null || true
	@aws cloudformation wait stack-delete-complete --stack-name RiderWorkshopIdeStack 2>/dev/null || true
	@echo "🗑️  Deleting services stack..."
	@aws cloudformation delete-stack --stack-name RiderWorkshopServicesStack
	@aws cloudformation wait stack-delete-complete --stack-name RiderWorkshopServicesStack
	@echo "🗑️  Deleting infrastructure stack..."
	@aws cloudformation delete-stack --stack-name RiderWorkshopInfrastructureStack
	@aws cloudformation wait stack-delete-complete --stack-name RiderWorkshopInfrastructureStack
	@echo "✅ All stacks destroyed!"

synth: ## Synthesize CloudFormation template
	@echo "📝 Synthesizing CloudFormation templates..."
	@(cd infrastructure && npx cdk synth RiderWorkshopInfrastructureStack --context deploymentType=infrastructure)
	@(cd infrastructure && npx cdk synth RiderWorkshopServicesStack --context deploymentType=services --context language=typescript)
	@(cd infrastructure && npx cdk synth RiderWorkshopIdeStack --context deploymentType=ide)
	@(cd infrastructure && npx cdk synth RiderWorkshopLoadGeneratorStack --context deploymentType=load-generator)
	@mkdir -p Workshop/static/cfn
	@cp infrastructure/cdk.out/RiderWorkshopInfrastructureStack.template.json Workshop/static/cfn/powertoolsworkshopinfra.json
	@cp infrastructure/cdk.out/RiderWorkshopServicesStack.template.json Workshop/static/cfn/powertoolsworkshopservices.json
	@cp infrastructure/cdk.out/RiderWorkshopIdeStack.template.json Workshop/static/cfn/powertoolsworkshopide.json
	@cp infrastructure/cdk.out/RiderWorkshopLoadGeneratorStack.template.json Workshop/static/cfn/powertoolsworkshopload.json
	@echo "✅ Templates copied to Workshop/static/cfn/"

bootstrap: ## Bootstrap CDK (run once per account/region)
	@echo "🚀 Bootstrapping CDK..."
	@cd infrastructure && cdk bootstrap
