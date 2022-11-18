import type {AppSyncIdentityCognito, AppSyncResolverEvent, Context} from "aws-lambda";
import {logger, tracer} from "./common/powertools";
import {dynamodbClientV3} from "./common/dynamodb-client";

const failureLambda = require('failure-lambda');

import {LambdaInterface} from '@aws-lambda-powertools/commons';
import {randomUUID} from "node:crypto";

import {
    GeneratePresignedUploadUrlMutationVariables,
    PresignedUrl,
} from "./common/types/API";
import {getPresignedUploadUrl} from "./common/presigned-url-utils";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";

class Lambda implements LambdaInterface {

    @tracer.captureMethod()
    protected async putFileMetadataInTable(fileId: string, key: string, type: string, userId: string, transformParams?: string) {
        return await dynamodbClientV3.put({
            TableName: dynamoDBTableFiles,
            Item: {
                id: fileId,
                key,
                status: "created",
                type,
                transformParams,
                userId,
            },
        });
    }

    @tracer.captureMethod()
    protected getObjectKey(type: string): string {
        switch (type) {
            case "video/mp4":
            case "video/webm":
            case "image/jpeg":
            case "image/png":
                return type;
            case "application/json":
                return `other`;
            default:
                return "other";
        }
    }

    @tracer.captureLambdaHandler()
    @logger.injectLambdaContext()
    public async handler(event: AppSyncResolverEvent<GeneratePresignedUploadUrlMutationVariables>, _context: Context): Promise<Partial<PresignedUrl>> {
        try {
            const fileId = randomUUID();
            const { type: fileType, transformParams } = event.arguments.input!;
            if (!fileType || !transformParams) {
                throw new Error("File type or transformParams not provided.");
            }

            const { username: userId } = event.identity as AppSyncIdentityCognito;
            const objectKeyValue = await this.getObjectKey(fileType);
            const objectKey = `uploads/${objectKeyValue}/${fileId}.${
                fileType.split("/")[1]
            }`;

            logger.info("[GET presigned-url] Object Key", {
                details: objectKey,
            });

            const uploadUrl = await getPresignedUploadUrl(
                objectKey,
                s3BucketFiles,
                fileType
            );

            logger.info("[GET presigned-url] File", {
                details: {url: uploadUrl, id: fileId},
            });

            const response = await this.putFileMetadataInTable(
                fileId,
                objectKey,
                fileType,
                userId,
                transformParams
            );

            logger.info("[GET presigned-url] DynamoDB response", {
                details: response,
            });

            return { url: uploadUrl, id: fileId };
        } catch (err) {
            logger.error("Unable to generate presigned url", err as Error);
            throw err;
        }
    }

}

const handlerClass = new Lambda();
export const handler = failureLambda(handlerClass.handler.bind(handlerClass));