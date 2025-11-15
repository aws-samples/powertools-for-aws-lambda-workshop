# Python Services - Powertools for AWS Lambda Workshop

Welcome to the Python implementation of the ride-sharing microservices!

## 📁 Service Structure

This folder contains six Lambda functions that work together to create a complete ride-sharing platform:

```
python/
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

When you've made changes to the Python services and are ready to deploy:

```bash
make deploy-python
```

This command will:
- Build all Python Lambda functions
- Package them with dependencies
- Deploy to your AWS account using CDK

## 💡 Workshop Tips

- Each service folder contains a `lambda_function.py` with the handler
- Models are defined in `models.py`
- Business logic is in `operations.py` or service-specific files
- Dependencies are listed in `requirements.txt` at the root

Happy coding! 🐍
