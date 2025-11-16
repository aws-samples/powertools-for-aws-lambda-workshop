# TypeScript Services - Powertools for AWS Lambda Workshop

Welcome to the TypeScript implementation of the ride-sharing microservices!

## 📁 Service Structure

This folder contains six Lambda functions that work together to create a complete ride-sharing platform:

```
typescript/
├── driver-matching-service/     # Matches riders with available drivers
├── dynamic-pricing-service/     # Calculates ride pricing based on demand
├── payment-processor/           # Handles payment transactions
├── payment-stream-processor/    # Processes payment events from DynamoDB Streams
├── ride-completion-service/     # Finalizes completed rides
└── ride-service/                # Manages ride lifecycle (API Gateway entry point)
```

## 🎯 What Each Service Does

- **ride-service**: Entry point for creating new rides via API Gateway
- **dynamic-pricing-service**: Calculates pricing with surge multipliers
- **driver-matching-service**: Finds and assigns the closest available driver
- **payment-processor**: Processes payments through a simulated gateway
- **payment-stream-processor**: Reacts to payment status changes in DynamoDB
- **ride-completion-service**: Updates ride and driver status when payment completes

## 💻 Opening the Terminal

1. Click on the **hamburger menu** (☰) in the top-left corner
2. Select **Terminal** → **New Terminal**
3. Or use the keyboard shortcut: **Ctrl + `** (backtick)

## 🚀 Deploying Your Changes

When you've made changes to the TypeScript services and are ready to deploy:

```bash
make deploy-typescript
```

This command will:
- Build all TypeScript Lambda functions
- Compile TypeScript to JavaScript
- Package with dependencies
- Deploy to your AWS account using CDK

## 💡 Workshop Tips

- Each service has its own `package.json` and `tsconfig.json`
- Entry point is `src/index.ts` with the Lambda handler
- Models and types are in `src/models.ts`
- Business logic is in `src/services/` folder
- Shared dependencies are in the root `package.json`

Happy coding! 🚀
