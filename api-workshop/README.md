# Building Serverless APIs with Powertools for AWS Lambda

This repository contains the infrastructure code for the workshop "Building Serverless APIs with Powertools for AWS Lambda".

- [Workshop link](https://catalog.workshops.aws/powertools-for-aws-lambda-event-handler/en-US/)


## Instructions

### Add resources to the workshop

The infrastructure code is built using the AWS Cloud Development Kit (CDK). The resources are defined in the `lib` folder.

The entry point for the stack is the file at `lib/building-serverless-apis-stack.ts`, which defines the stack and the resources that will be created.

One of the main group of constructs in the stack is the one that groups the resources needed to deploy the VSCode Server Web IDE that will be used by the attendees. This can be found in the `lib/attendant-ide` folder.

If you want to add more resources to the workshop, you can do so by adding more constructs to the stack. You should create new constructs in separate files and import them into the stack file grouping them by functionality.

### Modify the IDE environment

The VSCode Server Web IDE is deployed using the `attendant-ide` construct. This construct creates an EC2 instance with the VSCode Server running on it.

The configuration is done using the user data script that is passed to the EC2 instance. This script is defined in the `lib/attendant-ide/compute-construct.ts` file.

Commands are grouped by functionality and are executed in order. You can add more commands to the script to install more software or configure the environment as needed.

There are two types of commands that can be added to the script:

- Privileged commands: These are commands that are executed using the `root` user and have `/root` as the working directory.
- User commands: These are commands that are executed using the `ec2-user` user and have `/home/ec2-user` as the working directory.

Below an excerpt of the script:

```ts
userData.addCommands(
  `yum clean all`,
  // Install general dependencies
  `yum install -y --downloadonly  ${osPackages.join(' ')}`,
  this.#runCommandAsWhoamiUser(
    `sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended`
  ),
);
```

In this example the first two commands are privileged commands and the last one is a user command. User commands should be wrapped in the `#runCommandAsWhoamiUser` method to ensure they are executed as the `ec2-user` user.

Other important sections that you should know of are:

- VSCode extensions (search for `// Install & configure VSCode`) - Here you can add more extensions to be installed in the VSCode Server. Make sure to add only extensions that are strictly necessary for the workshop.
- Configuration of workspace (search for `// Configure workspace`) - Here you can add more configuration to the workspace. This can include the creation of files, directories, etc. that will be needed by the attendees.

### Add assets to the workshop

Attendees of the workshop will be provided with a series of files that will be used during the workshop. These are the files that will be present in the attendees' workspaces when they start the workshop.

The assets are stored in the `workshop-assets` folder. You can use this folder to develop locally as well.

The contents of this folder will be copied to the attendees' workspaces when they start the workshop. You can exclude files from being copied by adding them to the `exclude` section of the `workshopAssets` object in `lib/building-serverless-apis-stack.ts`.

### Develop & Deploy

To develop and deploy the workshop in your personal account, follow these steps:

- Clone this repository
- Install the dependencies by running `npm ci`
- Deploy the stack by running `npm run infra:deploy`

#### Other useful commands

- `npm run infra:synth` - Synthesize the CloudFormation template
- `npm run infra:deploy:hotswap` - Deploy the stack with hotswap fallback enabled. Things like AWS Lambda functions will be updated in place instead of being replaced, but if there are resources that cannot be updated in place, the stack will be deployed normally.
- `npm run infra:destroy` - Destroy the stack