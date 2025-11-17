# PowertoolsRide - Serverless Ride-Sharing Platform

Application that supports the [Workshop](https://catalog.workshops.aws/powertools-for-aws-lambda/en-US/) and demonstrates a fully serverless microservices architecture using AWS Lambda, EventBridge, and DynamoDB Streams.


## 🚀 Quick Start

### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Node.js 18+ and npm
- Docker (for Load generator)
- Make

### Deploy Infrastructure

```bash
# Install dependencies
make install

# Deploy core infrastructure (DynamoDB, EventBridge, IAM)
make deploy-infra

# Deploy services (choose your language)
make deploy-dotnet
# or: make deploy-java, make deploy-python, make deploy-typescript
```

### Available Commands

```bash
make help                      # Show all available commands
make deploy-infra             # Deploy infrastructure stack
make deploy-services          # Deploy services stack
make deploy-ide               # Deploy Web IDE (clones Git repo)
make deploy-load-generator    # Deploy Load generator infrastructure
make destroy                  # Destroy all stacks
```

## 💻 Web IDE Deployment

For workshop environments, deploy a browser-based IDE that clones the workshop repository:

```bash
# Deploy IDE with default repository
make deploy-ide

# Or specify a custom Git repository
GIT_REPO_URL=https://github.com/your-org/your-fork make deploy-ide
```

The IDE will automatically clone the specified Git repository on startup. Default repository: `https://github.com/aws-samples/powertools-for-aws-lambda-workshop`

## Run Locally

First export the `API_GATEWAY_URL` env variable

```bash
# url can be found in the make deploy-[runtime] outputs
export API_GATEWAY_URL=""
```

### Scripts folder

The scripts folder contains helper scripts to interact with the deployed application.

### Load generator

k6 is needed to run the load generation locally follow the link to [install K6](https://grafana.com/docs/k6/latest/set-up/install-k6/)

```bash
k6 run load-generator/src/all-modules.js 

# Or individually

k6 run load-generator/src/module1-observability.js
k6 run load-generator/src/module2-idempotency.js
k6 run load-generator/src/module3-batch-processing.js
```

## 🧹 Cleanup

```bash
# Destroy all stacks
make destroy

# Or manually delete specific stacks
aws cloudformation delete-stack --stack-name powertoolsworkshopservices
aws cloudformation delete-stack --stack-name powertoolsworkshopload
aws cloudformation delete-stack --stack-name powertoolsworkshopinfra
```

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License Summary

The documentation is made available under the Creative Commons Attribution-ShareAlike 4.0 International License. See the LICENSE file.

The sample code within this documentation is made available under the MIT-0 license. See the LICENSE-SAMPLECODE file.
