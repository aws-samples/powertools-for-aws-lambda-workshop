import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import { EXPORT_KEYS } from './config/stack-config';
import { CONSTANTS } from './constants';

export interface RiderWorkshopLoadGeneratorStackProps extends cdk.StackProps {
  /**
   * The module to test (module1-observability, module2-idempotency, module3-batch-processing)
   */
  module?: string;
  /**
   * Number of rides per minute to generate
   */
  ridesPerMinute?: number;
  /**
   * Interval to restart the load generator task to refresh credentials
   */
  restartInterval?: cdk.Duration;
  /**
   * S3 bucket containing the Docker image tarball
   */
  assetBucket?: string;
  /**
   * S3 key for the Docker image tarball (relative to bucket root)
   */
  dockerImageS3Key?: string;
}

/**
 * Load generator Stack for the PowertoolsRide workshop
 * Deploys ECS Fargate tasks to run K6 Load Generators with CloudWatch monitoring
 */
export class RiderWorkshopLoadGeneratorStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  private vpc: ec2.Vpc;
  private taskSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: RiderWorkshopLoadGeneratorStackProps = {}) {
    super(scope, id, props);

    // Import infrastructure references
    const apiUrl = this.getApiUrl();
    const eventBusName = cdk.Fn.importValue(EXPORT_KEYS.eventBusName);
    const paymentsTableName = cdk.Fn.importValue(EXPORT_KEYS.paymentsTableName);

    // Create VPC for ECS cluster
    this.vpc = new ec2.Vpc(this, 'LoadGeneratorVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'LoadGeneratorCluster', {
      clusterName: CONSTANTS.LOAD_TESTING.CLUSTER_NAME,
      vpc: this.vpc,
      containerInsights: true,
    });

    // Create task execution role
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Create task role with permissions
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant permissions to interact with AWS services
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:GetItem',
      ],
      resources: [
        cdk.Fn.importValue(EXPORT_KEYS.paymentsTableArn),
      ],
    }));

    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['events:PutEvents'],
      resources: [cdk.Fn.importValue(EXPORT_KEYS.eventBusArn)],
    }));

    // Create log group for task logs
    const logGroup = new logs.LogGroup(this, 'LoadGeneratorLogGroup', {
      logGroupName: CONSTANTS.LOAD_TESTING.LOG_GROUP_NAME,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Fargate task definition
    // Increased resources for running all modules simultaneously
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'LoadGeneratorTaskDef', {
      memoryLimitMiB: 4096,
      cpu: 2048,
      executionRole,
      taskRole,
    });

    // Determine image source
    let image: ecs.ContainerImage;

    if (props.assetBucket && props.dockerImageS3Key) {
      // Workshop Studio mode: Use provided S3 bucket
      const ecrRepo = this.createECRWithCodeBuildLoader(props.assetBucket, props.dockerImageS3Key);
      image = ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest');
    } else {
      // Local mode: Create S3 asset, upload tarball, and use CodeBuild
      const { bucketName, key } = this.createS3BucketAndUploadTarball();
      const ecrRepo = this.createECRWithCodeBuildLoader(bucketName, key);
      image = ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest');
    }

    // Add container to task definition
    this.taskDefinition.addContainer('LoadGeneratorContainer', {
      image,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'load-generator',
        logGroup,
      }),
      environment: {
        API_GATEWAY_URL: apiUrl,
        EVENT_BUS_NAME: eventBusName,
        PAYMENTS_TABLE_NAME: paymentsTableName,
        AWS_REGION: this.region,
        MODULE: props.module || 'all-modules', // Default to all modules
        TEST_DURATION: '0', // Run indefinitely, restarts handle credential refresh
        RIDES_PER_MINUTE: (props.ridesPerMinute || 120).toString(),
        EVENTS_PER_MINUTE: '10', // For module 2
        BATCHES_PER_MINUTE: '5', // For module 3
      },
    });

    // Automatically start a Load Generator task after deployment
    this.startLoadGeneratorTask();

    // Schedule periodic task restarts to refresh AWS credentials
    const restartInterval = props.restartInterval || cdk.Duration.hours(3);
    this.scheduleTaskRestart(restartInterval);

    // Output the cluster name
    new cdk.CfnOutput(this, 'LoadGeneratorClusterName', {
      value: this.cluster.clusterName,
      description: 'Name of the ECS cluster running the load generator',
      exportName: 'LoadGeneratorClusterName',
    });
  }

  private getApiUrl(): string {
    // Import the API URL from services stack
    // The trailing slash is handled in the load generator code (module1-observability.js)
    return cdk.Fn.importValue(EXPORT_KEYS.rideServiceApiUrl);
  }

  private startLoadGeneratorTask(): void {
    // Get public subnets for task execution (needed for ECR access)
    const subnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    });

    // Create security group for the task
    this.taskSecurityGroup = new ec2.SecurityGroup(this, 'LoadGeneratorTaskSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Load Generator ECS tasks',
      allowAllOutbound: true,
    });

    // Create a custom resource to automatically start a Load Generator task after deployment
    const startTaskRole = new iam.Role(this, 'StartTaskRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions to run, list, stop, and describe ECS tasks
    startTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'ecs:RunTask',
        'ecs:DescribeTasks',
        'ecs:ListTasks',
        'ecs:StopTask',
      ],
      resources: ['*'],
    }));

    // Grant permission to pass the task execution role and task role
    startTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [
        this.taskDefinition.executionRole!.roleArn,
        this.taskDefinition.taskRole.roleArn,
      ],
    }));

    // Create Lambda function to stop existing tasks and start a new one
    const stopAndStartFunction = new lambda.Function(this, 'StopAndStartTaskFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline(`
import boto3
import json
import time

ecs = boto3.client('ecs')

def handler(event, context):
    print(f"Event: {json.dumps(event)}")
    
    request_type = event['RequestType']
    cluster_name = event['ResourceProperties']['ClusterName']
    task_definition_arn = event['ResourceProperties']['TaskDefinitionArn']
    subnets = event['ResourceProperties']['Subnets']
    security_groups = event['ResourceProperties']['SecurityGroups']
    
    if request_type == 'Delete':
        # Stop all running tasks on stack deletion
        try:
            list_response = ecs.list_tasks(
                cluster=cluster_name,
                desiredStatus='RUNNING'
            )
            
            for task_arn in list_response.get('taskArns', []):
                print(f"Stopping task: {task_arn}")
                ecs.stop_task(cluster=cluster_name, task=task_arn)
        except Exception as e:
            print(f"Error stopping tasks: {e}")
        
        return {
            'PhysicalResourceId': 'LoadGeneratorTaskStarter',
            'Data': {}
        }
    
    # For Create and Update: Stop existing tasks and start a new one
    try:
        # List all running tasks in the cluster
        list_response = ecs.list_tasks(
            cluster=cluster_name,
            desiredStatus='RUNNING'
        )
        
        task_arns = list_response.get('taskArns', [])
        
        if task_arns:
            print(f"Found {len(task_arns)} running tasks. Stopping them...")
            
            # Stop all running tasks
            for task_arn in task_arns:
                print(f"Stopping task: {task_arn}")
                ecs.stop_task(cluster=cluster_name, task=task_arn)
            
            # Wait a bit for tasks to stop
            print("Waiting for tasks to stop...")
            time.sleep(5)
        else:
            print("No running tasks found.")
        
        # Start a new task
        print("Starting new Load Generator task...")
        run_response = ecs.run_task(
            cluster=cluster_name,
            taskDefinition=task_definition_arn,
            launchType='FARGATE',
            networkConfiguration={
                'awsvpcConfiguration': {
                    'subnets': subnets,
                    'securityGroups': security_groups,
                    'assignPublicIp': 'ENABLED'
                }
            }
        )
        
        new_task_arn = run_response['tasks'][0]['taskArn']
        print(f"Started new task: {new_task_arn}")
        
        return {
            'PhysicalResourceId': 'LoadGeneratorTaskStarter',
            'Data': {
                'TaskArn': new_task_arn
            }
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise
`),
      role: startTaskRole,
      timeout: cdk.Duration.minutes(5),
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    // Create custom resource provider
    const provider = new cr.Provider(this, 'StopAndStartTaskProvider', {
      onEventHandler: stopAndStartFunction,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    // Create custom resource
    const startTask = new cdk.CustomResource(this, 'StartLoadGeneratorTask', {
      serviceToken: provider.serviceToken,
      properties: {
        ClusterName: this.cluster.clusterName,
        TaskDefinitionArn: this.taskDefinition.taskDefinitionArn,
        Subnets: subnets.subnetIds,
        SecurityGroups: [this.taskSecurityGroup.securityGroupId],
        // Add a timestamp to force update on every deployment
        Timestamp: Date.now().toString(),
      },
    });

    // Ensure task definition is created before trying to run it
    startTask.node.addDependency(this.taskDefinition);
    startTask.node.addDependency(this.taskSecurityGroup);
  }

  private scheduleTaskRestart(restartInterval: cdk.Duration): void {
    // Create Lambda function to restart the task
    const restartTaskRole = new iam.Role(this, 'RestartTaskRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    restartTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'ecs:RunTask',
        'ecs:ListTasks',
        'ecs:StopTask',
      ],
      resources: ['*'],
    }));

    restartTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [
        this.taskDefinition.executionRole!.roleArn,
        this.taskDefinition.taskRole.roleArn,
      ],
    }));

    const restartFunction = new lambda.Function(this, 'RestartTaskFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import boto3
import json
import time

ecs = boto3.client('ecs')

def handler(event, context):
    cluster_name = event['ClusterName']
    task_definition_arn = event['TaskDefinitionArn']
    subnets = event['Subnets']
    security_groups = event['SecurityGroups']
    
    try:
        # Stop all running tasks
        list_response = ecs.list_tasks(
            cluster=cluster_name,
            desiredStatus='RUNNING'
        )
        
        for task_arn in list_response.get('taskArns', []):
            print(f"Stopping task: {task_arn}")
            ecs.stop_task(cluster=cluster_name, task=task_arn)
        
        if list_response.get('taskArns'):
            print("Waiting for tasks to stop...")
            time.sleep(5)
        
        # Start new task
        print("Starting new task...")
        run_response = ecs.run_task(
            cluster=cluster_name,
            taskDefinition=task_definition_arn,
            launchType='FARGATE',
            networkConfiguration={
                'awsvpcConfiguration': {
                    'subnets': subnets,
                    'securityGroups': security_groups,
                    'assignPublicIp': 'ENABLED'
                }
            }
        )
        
        new_task_arn = run_response['tasks'][0]['taskArn']
        print(f"Started new task: {new_task_arn}")
        
        return {'statusCode': 200, 'body': json.dumps({'taskArn': new_task_arn})}
        
    except Exception as e:
        print(f"Error: {e}")
        raise
`),
      role: restartTaskRole,
      timeout: cdk.Duration.minutes(5),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Get subnets for the restart function
    const subnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    });

    // Create EventBridge rule to trigger restart
    const restartRule = new events.Rule(this, 'RestartTaskRule', {
      schedule: events.Schedule.rate(restartInterval),
      description: 'Periodically restart load generator task to refresh AWS credentials',
    });

    restartRule.addTarget(new targets.LambdaFunction(restartFunction, {
      event: events.RuleTargetInput.fromObject({
        ClusterName: this.cluster.clusterName,
        TaskDefinitionArn: this.taskDefinition.taskDefinitionArn,
        Subnets: subnets.subnetIds,
        SecurityGroups: [this.taskSecurityGroup.securityGroupId],
      }),
    }));
  }

  /**
   * Create S3 bucket and upload Docker tarball
   */
  private createS3BucketAndUploadTarball(): { bucketName: string; key: string } {
    // Create S3 asset from the tarball
    const tarballAsset = new s3assets.Asset(this, 'LoadGeneratorTarballAsset', {
      path: '../load-generator/load-generator.tar',
    });

    // The asset is automatically uploaded to the CDK asset bucket
    const bucketName = tarballAsset.s3BucketName;
    const key = tarballAsset.s3ObjectKey;

    new cdk.CfnOutput(this, 'LoadGeneratorAssetBucketName', {
      value: bucketName,
      description: 'S3 bucket containing the load generator Docker image',
    });

    new cdk.CfnOutput(this, 'LoadGeneratorAssetKey', {
      value: key,
      description: 'S3 key for the load generator Docker image tarball',
    });

    return { bucketName, key };
  }

  /**
   * Create ECR repository and CodeBuild project to load Docker image from S3
   */
  private createECRWithCodeBuildLoader(s3Bucket: string, s3Key: string): ecr.Repository {
    // Create ECR repository
    const ecrRepo = new ecr.Repository(this, 'LoadGeneratorECRRepository', {
      repositoryName: 'powertools-workshop-load-generator',
      imageScanOnPush: false,
      lifecycleRules: [{
        description: 'Keep only the latest image',
        maxImageCount: 1,
        tagStatus: ecr.TagStatus.ANY,
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create CodeBuild role
    const codeBuildRole = new iam.Role(this, 'LoadDockerImageCodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser'),
      ],
    });

    // Grant S3 read access
    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:GetObjectVersion'],
      resources: [`arn:${this.partition}:s3:::${s3Bucket}/${s3Key}`],
    }));

    // Grant CloudWatch Logs permissions
    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [`arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/codebuild/*`],
    }));

    // Create CodeBuild project
    const buildSpec = codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        pre_build: {
          commands: [
            'echo "Downloading Docker image tarball from S3..."',
            'aws s3 cp s3://$S3_BUCKET/$S3_KEY /tmp/image.tar',
            'echo "Logging into Amazon ECR..."',
            'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com',
          ],
        },
        build: {
          commands: [
            'echo "Loading Docker image from tarball..."',
            'docker load -i /tmp/image.tar',
            'IMAGE_NAME=$(docker load -i /tmp/image.tar | grep "Loaded image" | sed \'s/Loaded image[^:]*: //g\')',
            'echo "Loaded image: $IMAGE_NAME"',
            'echo "Tagging image for ECR..."',
            'docker tag $IMAGE_NAME $ECR_REPOSITORY_URI:latest',
            'echo "Pushing image to ECR..."',
            'docker push $ECR_REPOSITORY_URI:latest',
          ],
        },
        post_build: {
          commands: [
            'echo "✅ Docker image successfully pushed to ECR"',
            'echo "Image URI: $ECR_REPOSITORY_URI:latest"',
          ],
        },
      },
    });

    const codeBuildProject = new codebuild.Project(this, 'LoadDockerImageCodeBuildProject', {
      projectName: 'LoadDockerImageToECR',
      role: codeBuildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: { value: this.account },
          AWS_REGION: { value: this.region },
          ECR_REPOSITORY_URI: { value: ecrRepo.repositoryUri },
          S3_BUCKET: { value: s3Bucket },
          S3_KEY: { value: s3Key },
        },
      },
      buildSpec,
    });

    // Create Lambda to trigger CodeBuild
    const triggerRole = new iam.Role(this, 'TriggerCodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    triggerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['codebuild:StartBuild', 'codebuild:BatchGetBuilds'],
      resources: [codeBuildProject.projectArn],
    }));

    const triggerFunction = new lambda.Function(this, 'TriggerCodeBuildFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      role: triggerRole,
      timeout: cdk.Duration.minutes(15),
      code: lambda.Code.fromInline(`
import boto3
import json
import time
import cfnresponse

codebuild = boto3.client('codebuild')

def handler(event, context):
    print(f"Event: {json.dumps(event)}")
    
    try:
        if event['RequestType'] == 'Delete':
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            return
        
        project_name = event['ResourceProperties']['ProjectName']
        
        print(f"Starting CodeBuild project: {project_name}")
        response = codebuild.start_build(projectName=project_name)
        build_id = response['build']['id']
        print(f"Build started: {build_id}")
        
        # Wait for build to complete
        while True:
            build_response = codebuild.batch_get_builds(ids=[build_id])
            build = build_response['builds'][0]
            status = build['buildStatus']
            
            print(f"Build status: {status}")
            
            if status == 'SUCCEEDED':
                print("✅ Build completed successfully")
                cfnresponse.send(event, context, cfnresponse.SUCCESS, {'BuildId': build_id})
                return
            elif status in ['FAILED', 'FAULT', 'TIMED_OUT', 'STOPPED']:
                print(f"❌ Build failed with status: {status}")
                cfnresponse.send(event, context, cfnresponse.FAILED, {'BuildId': build_id})
                return
            
            time.sleep(10)
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        cfnresponse.send(event, context, cfnresponse.FAILED, {'Error': str(e)})
`),
    });

    // Create custom resource to trigger build
    const provider = new cr.Provider(this, 'LoadDockerImageProvider', {
      onEventHandler: triggerFunction,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    new cdk.CustomResource(this, 'LoadDockerImageTrigger', {
      serviceToken: provider.serviceToken,
      properties: {
        ProjectName: codeBuildProject.projectName,
        Timestamp: Date.now().toString(),
      },
    });

    // Output ECR repository URI
    new cdk.CfnOutput(this, 'LoadGeneratorECRRepositoryUri', {
      value: ecrRepo.repositoryUri,
      description: 'URI of the ECR repository for the load generator',
    });

    return ecrRepo;
  }
}
