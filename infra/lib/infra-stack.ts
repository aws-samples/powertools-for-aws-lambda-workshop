import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnGroup } from 'aws-cdk-lib/aws-resourcegroups';
import { NagSuppressions } from 'cdk-nag';
import { Frontend } from './frontend';
import { ContentHubRepo } from './content-hub-repository';
import { ImageProcessing } from './image-processing';
import { VideoProcessing } from './video-processing';
import { TrafficGenerator } from './traffic-generator';
import { Experiments } from './chaos-experiments';
import { MonitoringConstruct } from './monitoring';
import {
  landingZoneBucketNamePrefix,
  powertoolsServiceName,
  environment,
} from './constants';

export class InfraStack extends Stack {
  public constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CfnGroup(this, 'resource-group', {
      name: `lambda-powertools-workshop-${environment}`,
      description: 'Resource Group for aws-lambda-powertools-workshop service',
      resourceQuery: {
        query: {
          tagFilters: [
            {
              key: 'Service',
              values: [powertoolsServiceName],
            },
          ],
        },
        type: 'TAG_FILTERS_1_0',
      },
    });

    const landingZoneBucketName = `${landingZoneBucketNamePrefix}-${Stack.of(this).account}-${environment}`;

    const frontend = new Frontend(this, 'frontend', {});

    // Content Hub Repository
    const contentHubRepo = new ContentHubRepo(this, 'content-hub-repo', {
      userPool: frontend.auth.userPool,
      landingZoneBucketName,
    });
    frontend.addApiBehavior(contentHubRepo.api.domain);

    // Image Processing Module
    const imageProcessing = new ImageProcessing(this, 'image-processing', {
      landingZoneBucketName,
    });
    contentHubRepo.storage.grantReadWrite(
      imageProcessing.functions.resizeImageFn
    );
    contentHubRepo.storage.grantReadWriteDataOnTable(
      imageProcessing.functions.resizeImageFn
    );
    contentHubRepo.api.api.grantMutation(
      imageProcessing.functions.resizeImageFn,
      'updateFileStatus'
    );
    imageProcessing.functions.resizeImageFn.addEnvironment(
      'APPSYNC_ENDPOINT',
      `https://${contentHubRepo.api.domain}/graphql`
    );

    // Video Processing Module
    const videoProcessing = new VideoProcessing(this, 'video-processing', {
      landingZoneBucketName,
    });
    contentHubRepo.storage.grantReadWrite(
      videoProcessing.functions.resizeVideoFn
    );
    contentHubRepo.storage.grantReadWriteDataOnTable(
      videoProcessing.functions.resizeVideoFn
    );
    contentHubRepo.api.api.grantMutation(
      videoProcessing.functions.resizeVideoFn,
      'updateFileStatus'
    );

    videoProcessing.functions.resizeVideoFn.addEnvironment(
      'APPSYNC_ENDPOINT',
      `https://${contentHubRepo.api.domain}/graphql`
    );

    // Traffic Generator Component
    const trafficGenerator = new TrafficGenerator(
      this,
      'traffic-generator',
      {}
    );
    trafficGenerator.functions.usersGeneratorFn.addEnvironment(
      'COGNITO_USER_POOL_CLIENT_ID',
      frontend.auth.userPoolClient.userPoolClientId
    );
    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      'COGNITO_USER_POOL_ID',
      frontend.auth.userPool.userPoolId
    );
    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      'COGNITO_USER_POOL_CLIENT_ID',
      frontend.auth.userPoolClient.userPoolClientId
    );
    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      'API_URL',
      `https://${contentHubRepo.api.domain}/graphql`
    );
    frontend.auth.userPool.grant(
      trafficGenerator.functions.trafficGeneratorFn,
      'cognito-idp:AdminInitiateAuth'
    );

    // Experiments component
    new Experiments(
      this,
      'chaos-experiments',
      {
        'process-image': imageProcessing.parameters.processImageFailuresString.stringParameter.parameterName,
        'process-video': videoProcessing.parameters.processVideoFailuresString.stringParameter.parameterName,
        'get-upload-url': contentHubRepo.parameters.getUploadUrlFailuresString.stringParameter.parameterName
      }
    );

    // Monitoring
    new MonitoringConstruct(this, `monitoring-construct`, {
      tableName: contentHubRepo.storage.filesTable.tableName,
      functionName: imageProcessing.functions.resizeImageFn.functionName,
      queueName: imageProcessing.queues.processingQueue.queueName,
    });

    new CfnOutput(this, 'AWSRegion', {
      value: Stack.of(this).region,
    });

    [
      'InfraStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource',
      'InfraStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource',
      'InfraStack/traffic-generator/DummyUsersProvider/framework-onEvent/ServiceRole/Resource',
      'InfraStack/traffic-generator/DummyUsersProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
      'InfraStack/traffic-generator/DummyUsersProvider/framework-onEvent/Resource',
    ].forEach((resourcePath: string) => {
      let id = 'AwsSolutions-L1';
      let reason = 'Resource created and managed by CDK.';
      if (resourcePath.endsWith('ServiceRole/Resource')) {
        id = 'AwsSolutions-IAM4';
      } else if (resourcePath.endsWith('DefaultPolicy/Resource')) {
        id = 'AwsSolutions-IAM5';
        reason +=
          ' This type of resource is a singleton fn that interacts with many resources so IAM policies are lax by design to allow this use case.';
      }
      NagSuppressions.addResourceSuppressionsByPath(this, resourcePath, [
        {
          id,
          reason,
        },
      ]);
    });

    [
      'InfraStack/content-hub-repo/api-construct/graphql-api/lambda-get-presigned-download-url/ServiceRole/DefaultPolicy/Resource',
      'InfraStack/content-hub-repo/api-construct/graphql-api/files-table/ServiceRole/DefaultPolicy/Resource',
      'InfraStack/content-hub-repo/api-construct/graphql-api/lambda-get-presigned-upload-url/ServiceRole/DefaultPolicy/Resource'
    ].forEach((resourcePath: string) => {
      NagSuppressions.addResourceSuppressionsByPath(this, resourcePath, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard needed to allow generic AppSync resolvers.',
        }
      ]);
    });

    [
      'InfraStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/Resource',
      'InfraStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy/Resource'
    ].forEach((resourcePath: string) => {
      NagSuppressions.addResourceSuppressionsByPath(this, resourcePath, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Resource created and managed by CDK.'
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard needed to allow generic AppSync resolvers.',
        }
      ]);
    });
  }
}