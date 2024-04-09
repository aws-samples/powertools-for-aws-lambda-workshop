# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Deploying this project

This project consists of two stacks:

### 1. powertoolsworkshopinfra

This stack is responsible for creating the following resources:

- AWS Lambda function
- Amazon SQS queue
- Amazon DynamoDB table
- Amazon S3 bucket
- Frontend application

To deploy this stack, run the following command:

`cdk deploy powertoolsworkshopinfra`

### 2. powertoolsworkshopide

This stack is responsible for creating a Visual Studio Code (VSCode) instance in the browser, preconfigured with all the necessary requirements.

To deploy this stack, run the following command:

`cdk deploy powertoolsworkshopide`

#### Setting a Custom Password

The default password for the VSCode online instance is `powertools-workshop`. If you want to set a custom password, you can pass it as a parameter using the following command:

`cdk deploy powertoolsworkshopide --parameters vscodePasswordParameter=YOUR_CUSTOM_PASSWORD`

Replace `YOUR_CUSTOM_PASSWORD` with the desired password.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
