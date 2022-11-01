import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { URL } from "url";
import { default as request } from "phin";
import type {
  GraphQLOperation,
  UpdateFileStatusMutationInputs,
} from "./types/GraphQLOperations";

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

  public async send(query: GraphQLOperation<UpdateFileStatusMutationInputs>) {
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

      console.debug(result.body);
      if (result.body?.errors) throw new Error(result.body.errors[0].message);
    } catch (err) {
      console.error(err);
      throw new Error("Failed to execute GraphQL operation");
    }
  }

  private buildHttpRequest(
    query: GraphQLOperation<UpdateFileStatusMutationInputs>
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
