/**
 * AWS Utilities for k6 Load generator
 * 
 * Provides AWS SigV4 signing and common utilities for AWS service calls
 */

import http from 'k6/http';
import crypto from 'k6/crypto';

// Generate UUIDv4
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get current ISO timestamp
export function getCurrentTimestamp() {
    return new Date().toISOString();
}

// Get AWS timestamp in format YYYYMMDDTHHMMSSZ
function getAmzDate() {
    const now = new Date();
    return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

// Get AWS date in format YYYYMMDD
function getDateStamp() {
    const now = new Date();
    return now.toISOString().substring(0, 10).replace(/-/g, '');
}

// AWS SigV4 signing helpers
function sign(key, msg) {
    return crypto.hmac('sha256', key, msg, 'binary');
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = sign('AWS4' + key, dateStamp);
    const kRegion = sign(kDate, regionName);
    const kService = sign(kRegion, serviceName);
    const kSigning = sign(kService, 'aws4_request');
    return kSigning;
}

/**
 * Send a signed request to an AWS service using SigV4
 * 
 * @param {Object} params - Request parameters
 * @param {string} params.service - AWS service name (e.g., 'events', 'dynamodb')
 * @param {string} params.region - AWS region
 * @param {string} params.method - HTTP method (default: 'POST')
 * @param {string} params.path - Request path (default: '/')
 * @param {Object} params.payload - Request payload object
 * @param {Object} params.headers - Additional headers
 * @param {string} params.accessKeyId - AWS access key ID
 * @param {string} params.secretAccessKey - AWS secret access key
 * @param {string} params.sessionToken - AWS session token (optional)
 * @returns {Object} HTTP response
 */
export function awsSignedRequest(params) {
    const {
        service,
        region,
        method = 'POST',
        path = '/',
        payload,
        headers = {},
        accessKeyId,
        secretAccessKey,
        sessionToken,
    } = params;

    const host = `${service}.${region}.amazonaws.com`;
    const endpoint = `https://${host}${path}`;
    const payloadString = JSON.stringify(payload);

    const amzDate = getAmzDate();
    const dateStamp = getDateStamp();

    // Create canonical request
    const payloadHash = crypto.sha256(payloadString, 'hex');

    // Build canonical headers - must be sorted alphabetically
    // Normalize all header keys to lowercase
    const canonicalHeadersObj = {
        host: host,
        'x-amz-date': amzDate,
    };
    
    // Add custom headers (normalize to lowercase)
    for (const [key, value] of Object.entries(headers)) {
        canonicalHeadersObj[key.toLowerCase()] = value;
    }

    // Add session token if present
    if (sessionToken) {
        canonicalHeadersObj['x-amz-security-token'] = sessionToken;
    }

    // Sort headers alphabetically
    const sortedHeaderKeys = Object.keys(canonicalHeadersObj).sort();
    const canonicalHeaders = sortedHeaderKeys
        .map((key) => `${key}:${canonicalHeadersObj[key]}`)
        .join('\n') + '\n';
    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.sha256(canonicalRequest, 'hex')}`;

    // Calculate signature
    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = crypto.hmac('sha256', signingKey, stringToSign, 'hex');

    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Build final headers (without spread operator for k6 compatibility)
    const finalHeaders = {
        'X-Amz-Date': amzDate,
        'Authorization': authorizationHeader,
    };
    
    // Add custom headers
    for (const [key, value] of Object.entries(headers)) {
        finalHeaders[key] = value;
    }

    // Add session token if present
    if (sessionToken) {
        finalHeaders['X-Amz-Security-Token'] = sessionToken;
    }

    return http.post(endpoint, payloadString, { headers: finalHeaders });
}

/**
 * Send event to EventBridge
 * 
 * @param {Object} params - EventBridge parameters
 * @param {Object} params.event - Event object to send
 * @param {string} params.eventBusName - EventBridge bus name
 * @param {string} params.source - Event source
 * @param {string} params.detailType - Event detail type
 * @param {string} params.region - AWS region
 * @param {string} params.accessKeyId - AWS access key ID
 * @param {string} params.secretAccessKey - AWS secret access key
 * @param {string} params.sessionToken - AWS session token (optional)
 * @returns {Object} HTTP response
 */
export function sendEventBridgeEvent(params) {
    const {
        event,
        eventBusName,
        source,
        detailType,
        region,
        accessKeyId,
        secretAccessKey,
        sessionToken,
    } = params;

    return awsSignedRequest({
        service: 'events',
        region: region,
        method: 'POST',
        path: '/',
        payload: {
            Entries: [
                {
                    Source: source,
                    DetailType: detailType,
                    Detail: JSON.stringify(event),
                    EventBusName: eventBusName,
                },
            ],
        },
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSEvents.PutEvents',
        },
        accessKeyId,
        secretAccessKey,
        sessionToken,
    });
}

/**
 * Validate AWS credentials are present
 * 
 * @param {string} accessKeyId - AWS access key ID
 * @param {string} secretAccessKey - AWS secret access key
 * @param {string} sessionToken - AWS session token (optional)
 * @returns {boolean} True if credentials are valid
 */
export function validateAwsCredentials(accessKeyId, secretAccessKey, sessionToken) {
    console.log('🔐 AWS Credentials Check:');
    console.log(`  Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : '❌ NOT SET'}`);
    console.log(`  Secret Key: ${secretAccessKey ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`  Session Token: ${sessionToken ? '✅ SET (using ECS task role)' : 'Not set (using IAM user)'}`);
    console.log('');

    if (!accessKeyId || !secretAccessKey) {
        console.log('❌ ERROR: AWS credentials not configured!');
        console.log('');
        console.log('Set credentials via environment variables:');
        console.log('  export AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)');
        console.log('  export AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)');
        console.log('');
        console.log('Or use the helper script: ./run-module2.sh');
        console.log('');
        console.log('When running in ECS, ensure task role has proper permissions.');
        return false;
    }

    return true;
}

/**
 * Put item to DynamoDB
 * 
 * @param {Object} params - DynamoDB parameters
 * @param {string} params.tableName - DynamoDB table name
 * @param {Object} params.item - Item to put (in DynamoDB JSON format)
 * @param {string} params.region - AWS region
 * @param {string} params.accessKeyId - AWS access key ID
 * @param {string} params.secretAccessKey - AWS secret access key
 * @param {string} params.sessionToken - AWS session token (optional)
 * @returns {Object} HTTP response
 */
export function putDynamoDBItem(params) {
  const {
    tableName,
    item,
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken,
  } = params;

  return awsSignedRequest({
    service: 'dynamodb',
    region: region,
    method: 'POST',
    path: '/',
    payload: {
      TableName: tableName,
      Item: item,
    },
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': 'DynamoDB_20120810.PutItem',
    },
    accessKeyId,
    secretAccessKey,
    sessionToken,
  });
}

/**
 * Update item in DynamoDB
 * 
 * @param {Object} params - DynamoDB parameters
 * @param {string} params.tableName - DynamoDB table name
 * @param {Object} params.key - Primary key (in DynamoDB JSON format)
 * @param {string} params.updateExpression - Update expression
 * @param {Object} params.expressionAttributeNames - Expression attribute names (optional)
 * @param {Object} params.expressionAttributeValues - Expression attribute values
 * @param {string} params.region - AWS region
 * @param {string} params.accessKeyId - AWS access key ID
 * @param {string} params.secretAccessKey - AWS secret access key
 * @param {string} params.sessionToken - AWS session token (optional)
 * @returns {Object} HTTP response
 */
export function updateDynamoDBItem(params) {
  const {
    tableName,
    key,
    updateExpression,
    expressionAttributeNames,
    expressionAttributeValues,
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken,
  } = params;

  const payload = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  if (expressionAttributeNames) {
    payload.ExpressionAttributeNames = expressionAttributeNames;
  }

  return awsSignedRequest({
    service: 'dynamodb',
    region: region,
    method: 'POST',
    path: '/',
    payload: payload,
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': 'DynamoDB_20120810.UpdateItem',
    },
    accessKeyId,
    secretAccessKey,
    sessionToken,
  });
}
