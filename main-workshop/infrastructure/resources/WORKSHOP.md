# 🎓 Powertools for AWS Lambda Workshop

Welcome to the Powertools for AWS Lambda Workshop! This hands-on workshop will guide you through building serverless applications using AWS Lambda with best practices for observability, idempotency, and batch processing.

## 📁 Project Structure

This repository is organized to help you focus on what matters - learning Powertools:

```
Workshop/
├── infrastructure/       # CDK infrastructure code (pre-configured)
├── scripts/              # Helper scripts for deployment
└── services/             # 👈 YOUR FOCUS: Lambda functions in multiple runtimes
│   ├── dotnet/           # .NET implementation
│   ├── java/             # Java implementation
│   ├── python/           # Python implementation
│   └── typescript/       # TypeScript implementation
```

## 💻 Opening the Terminal

### In the Web IDE (code-server)
1. Click on the **hamburger menu** (☰) in the top-left corner
2. Select **Terminal** → **New Terminal**
3. Or use the keyboard shortcut: **Ctrl + `** (backtick)

The terminal will open at the project root directory.

## 🚀 Workshop Commands

### 1. Starting Your Development Environment

**Choose your preferred runtime** (Python, TypeScript, Java, or .NET) and work within that folder throughout the workshop.

```bash
# Choose ONE based on your preferred language:
make start-python
make start-typescript
make start-java
make start-dotnet
```

This command prepares your development environment and installs necessary dependencies.

### 2. Deploying Your Changes

During the workshop, you'll use these commands at specific points when asked:

```bash
# Choose ONE based on your preferred language:
make deploy-python
make deploy-typescript
make deploy-java
make deploy-dotnet
```