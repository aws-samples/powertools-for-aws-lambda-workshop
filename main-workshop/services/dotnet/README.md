# .NET Services - Powertools for AWS Lambda Workshop

Welcome to the .NET implementation of the ride-sharing microservices!

## 📁 Service Structure

This folder contains six Lambda functions that work together to create a complete ride-sharing platform:

```
dotnet/
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

When you've made changes to the .NET services and are ready to deploy:

```bash
make deploy-dotnet
```

This command will:
- Build all .NET Lambda functions
- Restore NuGet packages
- Compile and package as deployment packages
- Deploy to your AWS account using CDK

## 💡 Workshop Tips

- Each service has its own `.csproj` file
- Handler is in `Function.cs` with the `FunctionHandler` method
- Models are in the `Models/` folder
- Business logic is in `Services/` folder
- Shared package versions are managed in `Directory.Packages.props`

Happy coding! 🚀
