import type { APIGatewayProxyResult } from 'aws-lambda';

export class RouteHandler {
  static created(data: any): APIGatewayProxyResult {
    return RouteHandler.createResponse(201, data);
  }

  static badRequest(message: string): APIGatewayProxyResult {
    return RouteHandler.createResponse(400, { error: message });
  }

  static notFound(message: string): APIGatewayProxyResult {
    return RouteHandler.createResponse(404, { error: message });
  }

  static handleError(): APIGatewayProxyResult {
    return RouteHandler.createResponse(500, { error: 'Internal Server Error' });
  }

  private static createResponse(
    statusCode: number,
    data: any
  ): APIGatewayProxyResult {
    return {
      statusCode,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}
