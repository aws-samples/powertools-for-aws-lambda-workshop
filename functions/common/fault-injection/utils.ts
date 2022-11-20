import type { Tracer } from "@aws-lambda-powertools/tracer";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

interface FailureSettings {
  isEnabled: boolean;
  rate: number;
  failureMode: string;
  minLatency: number;
  maxLatency: number;
  exceptionMsg: string;
  statusCode: number;
  diskSpace: number;
  denylist: string[];
}

const failureInjectionParamName = process.env.FAILURE_INJECTION_PARAM || "";
let ssmClient: SSMClient;

const getSettings = async (tracer: Tracer): Promise<FailureSettings> => {
  if (!ssmClient) {
    ssmClient = tracer.captureAWSv3Client(new SSMClient({}));
  }

  const { Parameter } = await ssmClient.send(
    new GetParameterCommand({ Name: failureInjectionParamName })
  );
  if (!Parameter || !Parameter.Value)
    throw new Error(`Parameter ${failureInjectionParamName} not found`);
  const parsedSettings = JSON.parse(Parameter.Value);

  return parsedSettings;
};

export { getSettings };
