using System;
using System.Linq;
using System.Threading.Tasks;
using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using Amazon.XRay.Recorder.Handlers.AwsSdk;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Metrics;
using AWS.Lambda.Powertools.Tracing;
using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using AWS.Lambda.Powertools.Parameters;
using AWS.Lambda.Powertools.Parameters.SecretsManager;
using AWS.Lambda.Powertools.Parameters.SimpleSystemsManagement;

namespace PowertoolsWorkshop
{
    public class ImageDetectionFunction
    {
        private static string _filesBucketName;
        private static string _apiUrlParameterName;
        private static string _apiKeySecretName;
        private static IAmazonRekognition _rekognitionClient;
        private static ISsmProvider _ssmProvider;
        private static ISecretsProvider _secretsProvider;
        private static IApiOperations _apiOperations;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ImageDetectionFunction()
        {
            AWSSDKHandler.RegisterXRayForAllServices();

            _filesBucketName = Environment.GetEnvironmentVariable("BUCKET_NAME_FILES");
            _apiUrlParameterName = Environment.GetEnvironmentVariable("API_URL_PARAMETER_NAME");
            _apiKeySecretName = Environment.GetEnvironmentVariable("API_KEY_SECRET_NAME");
            
            _rekognitionClient = new AmazonRekognitionClient();
            _apiOperations = new ApiOperations();

            ParametersManager.DefaultMaxAge(TimeSpan.FromSeconds(900));
            _ssmProvider = ParametersManager.SsmProvider;
            _secretsProvider = ParametersManager.SecretsProvider;
        }

        /// <summary>
        /// This method is called for every Lambda invocation. This method takes in an S3 event object and can be used 
        /// to respond to S3 notifications.
        /// </summary>
        /// <param name="dynamoEvent"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        [Metrics(CaptureColdStart = true)]
        [Tracing(CaptureMode = TracingCaptureMode.ResponseAndError)]
        [Logging(LogEvent = true, LoggerOutputCase = LoggerOutputCase.PascalCase)]
        public async Task FunctionHandler(DynamoDBEvent dynamoEvent, ILambdaContext context)
        {
            Logger.LogInformation($"Beginning to process {dynamoEvent.Records.Count} records...");

            foreach (var record in dynamoEvent.Records)
            {
                var fileId = record.Dynamodb.NewImage["id"].S;
                var userId = record.Dynamodb.NewImage["userId"].S;
                var transformedFileKey = record.Dynamodb.NewImage["transformedFileKey"].S;

                if (!await HasPersonLabel(fileId, userId, transformedFileKey).ConfigureAwait(false))
                {
                    await ReportImageIssue(fileId, userId).ConfigureAwait(false);
                }
            }

            Logger.LogInformation("Stream processing complete.");
        }

        [Tracing]
        private async Task<bool> HasPersonLabel(string fileId, string userId, string transformedFileKey)
        {
            Logger.LogInformation($"Get labels for File Id: {fileId}");
            Tracing.AddAnnotation("FileId", fileId);

            var response = await _rekognitionClient.DetectLabelsAsync(new DetectLabelsRequest
            {
                Image = new Image
                {
                    S3Object = new S3Object
                    {
                        Bucket = _filesBucketName,
                        Name = transformedFileKey
                    },
                }
            }).ConfigureAwait(false);

            if (response?.Labels is null || !response.Labels.Any())
            {
                Logger.LogWarning(new { FileId = fileId, UserId = userId }, "No labels found in image");
                return false;
            }

            if (!response.Labels.Any(l =>
                    string.Equals(l.Name, "Person", StringComparison.InvariantCultureIgnoreCase) &&
                    l.Confidence > 75))
            {
                Logger.LogWarning(new { FileId = fileId, UserId = userId }, "No person found in image");
                return false;
            }

            Logger.LogInformation(new { FileId = fileId, UserId = userId }, "Person found in image");
            return true;
        }

        [Tracing]
        private async Task ReportImageIssue(string fileId, string userId)
        {
            var apiUrl = await _ssmProvider.GetAsync(_apiUrlParameterName).ConfigureAwait(false);
            var apiKey = await _secretsProvider.GetAsync(_apiKeySecretName).ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(apiUrl) || string.IsNullOrWhiteSpace(apiKey))
                throw new Exception($"Missing apiUrl or apiKey. apiUrl: ${apiUrl}, apiKey: ${apiKey}");

            Logger.LogInformation("Sending report to the API");

            await _apiOperations.PosAsJsonAsync(apiUrl, apiKey, new { fileId, userId }).ConfigureAwait(false);

            Logger.LogInformation("Report sent to the API");
        }
    }
}
