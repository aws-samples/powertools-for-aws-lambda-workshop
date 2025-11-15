.PHONY: deploy-java deploy-typescript deploy-python deploy-dotnet start-java start-typescript start-python start-dotnet

# Variables
SCRIPTS_DIR = ./scripts

deploy-java: ## Deploy Java services only
	@bash $(SCRIPTS_DIR)/deploy.sh services java

deploy-typescript: ## Deploy TypeScript services only
	@bash $(SCRIPTS_DIR)/deploy.sh services typescript

deploy-python: ## Deploy Python services only
	@bash $(SCRIPTS_DIR)/deploy.sh services python

deploy-dotnet: ## Deploy .NET services only
	@bash $(SCRIPTS_DIR)/deploy.sh services dotnet

start-java: ## Open Java services folder in VS Code
	@code services/java -r

start-typescript: ## Open TypeScript services folder in VS Code
	@code services/typescript -r

start-python: ## Open Python services folder in VS Code
	@code services/python -r

start-dotnet: ## Open .NET services folder in VS Code
	@code services/dotnet -r
