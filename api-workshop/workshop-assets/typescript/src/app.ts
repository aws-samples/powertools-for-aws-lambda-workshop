/**
 * Imports - app.ts
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Classes, functions and instances - app.ts
 */
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient());

/**
 * Get all orders method - app.ts
 */
const getAllOrders = async () => {
  const response = await ddbDocClient.send(
    new ScanCommand({
      TableName: 'OrdersWorkshop',
    })
  );
  if (response.Items && response.Items.length > 0) {
    return {
      statusCode: 200,
      body: JSON.stringify(response.Items),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'No orders found' }),
  };
};

/**
 * Get order method - app.ts
 */
const getOrder = async (event: APIGatewayProxyEvent) => {
  const orderId = event.queryStringParameters?.orderId;
  const response = await ddbDocClient.send(
    new GetCommand({
      TableName: 'OrdersWorkshop',
      Key: { orderId: orderId },
    })
  );

  if (response.Item) {
    return {
      statusCode: 200,
      body: JSON.stringify(response.Item),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Order not found' }),
  };
};

/**
 * Lambda Handler - app.ts
 */
export const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  const httpMethod = event.httpMethod;

  if (
    httpMethod === 'GET' &&
    event.queryStringParameters === null &&
    event.path === '/orders'
  ) {
    return getAllOrders();
  }
  if (httpMethod === 'GET' && event.path === '/orders') {
    return getOrder(event);
  }
  return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Unsupported HTTP method' }),
  };
};
