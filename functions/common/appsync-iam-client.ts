import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { URL } from "url";
import { default as request } from "phin";
import type { UpdateFileStatusMutationVariables } from "./types/API";
import { updateFileStatus } from "./graphql/mutations";
import type { FileStatus } from "./types/File";

type GraphQLOperation<T> = {
  query: string;
  operationName?: string;
  variables: T;
};

type AppSyncIamClientProps = {
  url: string;
  region: string;
};

class AppSyncIamClient {
  private apiUrl: string;
  private region: string;
  private signer: SignatureV4;

  public constructor({ url, region }: AppSyncIamClientProps) {
    this.apiUrl = url;
    this.region = region;
    if (this.apiUrl === "") throw new Error("APPSYNC_ENDPOINT env var not set");
    if (this.region === "") throw new Error("AWS_REGION env var not set");

    this.signer = new SignatureV4({
      credentials: defaultProvider(),
      service: "appsync",
      region: this.region,
      sha256: Sha256,
    });
  }

  public async send(
    query: GraphQLOperation<UpdateFileStatusMutationVariables>
  ) {
    const httpRequest = this.buildHttpRequest(query);
    const signedHttpRequest = await this.signRequest(httpRequest);
    try {
      const result = await request<{
        data: { updateFileStatus: {} };
        errors: { message: string; errorType: string }[];
      }>({
        url: this.apiUrl,
        headers: signedHttpRequest.headers,
        data: signedHttpRequest.body,
        method: signedHttpRequest.method,
        timeout: 5000,
        parse: "json",
      });
      if (result.body?.errors) throw new Error(result.body.errors[0].message);
    } catch (err) {
      console.error(err);
      throw new Error("Failed to execute GraphQL operation");
    }
  }

  private buildHttpRequest(
    query: GraphQLOperation<UpdateFileStatusMutationVariables>
  ) {
    const url = new URL(this.apiUrl);
    return new HttpRequest({
      hostname: url.hostname,
      path: url.pathname,
      body: JSON.stringify(query),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: url.hostname,
      },
    });
  }

  private async signRequest(request: HttpRequest) {
    return await this.signer.sign(request);
  }
}

const appSyncIamClient = new AppSyncIamClient({
  url: process.env.APPSYNC_ENDPOINT || "",
  region: process.env.AWS_REGION || "",
});

export { appSyncIamClient };

export enum FileStatuses {
  QUEUED = "queued",
  WORKING = "in-progress",
  DONE = "completed",
  FAIL = "failed",
}

/**
 * Utility function to update the status of a given asset.
 *
 * It takes a fileId and a status and it triggers an AppSync Mutation.
 * The mutation has two side effects:
 * - Write the new state in the DynamoDB Table
 * - Forward the update to any subscribed client (i.e. the frontend app)
 *
 * @param {string} fileId - The id of the file to update
 * @param {FileStatus} status - Status of the file after the mutation update
 */
export const markFileAs = async (fileId: string, status: FileStatus) => {
  const graphQLOperation = {
    query: updateFileStatus,
    operationName: "UpdateFileStatus",
    variables: {
      input: {
        id: fileId,
        status,
      },
    },
  };
  await appSyncIamClient.send(graphQLOperation);
};
