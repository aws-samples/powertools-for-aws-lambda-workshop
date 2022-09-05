export const dynamoFilesTableName = "FilesTable";
export const dynamoFilesGsiName = "filesIndex";

export const websiteBucketNamePrefix = "website";
export const landingZoneBucketNamePrefix = "landing-zone";

export const environment =
  process.env.NODE_ENV === "production" ? "prod" : "dev";

export const powertoolsServiceName =
  "aws-lambda-powertools-typescript-workshop";
export const powertoolsLoggerLogLevel =
  process.env.NODE_ENV === "production" ? "WARN" : "DEBUG";
export const powertoolsLoggerSampleRate =
  process.env.NODE_ENV === "production" ? "0.1" : "1";
export const powertoolsMetricsNamespace = "octank"; // Dummy company name
