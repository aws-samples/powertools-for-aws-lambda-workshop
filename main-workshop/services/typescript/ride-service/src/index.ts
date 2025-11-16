import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { RideService } from './services/RideService';
import { RouteHandler } from './utils/RouteHandler';

const rideService = new RideService();

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing request:', event.path);

  try {
    // Check if this is a POST /rides request
    if (event.httpMethod !== 'POST' || event.path !== '/rides') {
      return RouteHandler.notFound('Endpoint not found');
    }

    // Extract headers
    const deviceId = getDeviceIdFromHeaders(event.headers);

    // Create ride (validation happens in service)
    const result = await rideService.createRide(event, deviceId);

    if (!result.success) {
      console.error(`Error creating ride: ${result.errorMessage}`);
      return RouteHandler.handleError();
    }

    console.log(`Ride created successfully for rider ${result.ride!.riderId}`);
    return RouteHandler.created(result.ride);
  } catch (error) {
    console.error('Unexpected error:', error);
    return RouteHandler.handleError();
  }
};

function getDeviceIdFromHeaders(
  headers: { [key: string]: string | undefined } | null
): string {
  const deviceId = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === 'x-device-id'
  )?.[1];

  if (!deviceId) {
    throw new Error('Header not found');
  }

  return deviceId;
}
