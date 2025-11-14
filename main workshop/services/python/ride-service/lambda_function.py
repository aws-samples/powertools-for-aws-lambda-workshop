from typing import Any

from operations import RideOperations
from utils import RouteHandler

ride_ops = RideOperations()


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Lambda handler for API Gateway requests"""
    print(f"Processing request: {event.get('path')}")

    try:
        # Check if this is a POST /rides request
        if event.get("httpMethod") != "POST" or event.get("path") != "/rides":
            return RouteHandler.not_found("Endpoint not found")

        # Extract device ID from headers
        headers = event.get("headers", {})
        device_id = get_device_id_from_headers(headers)

        # Create ride (validation happens in operations)
        result = ride_ops.create_ride(event.get("body"), device_id)

        if not result.success:
            print(f"Error creating ride: {result.error_message}")
            return RouteHandler.handle_error()

        print(f"Ride created successfully for rider {result.ride.rider_id}")
        return RouteHandler.created(result.ride.to_dict())

    except Exception as ex:
        print(f"Unexpected error: {ex}")
        return RouteHandler.handle_error()


def get_device_id_from_headers(headers: dict[str, str] | None) -> str:
    """Extract device ID from headers (case-insensitive)"""
    if not headers:
        raise Exception("Header not found")

    device_id_key = next(
        (k for k in headers.keys() if k.lower() == "x-device-id"), None
    )

    if not device_id_key:
        raise Exception("Header not found")

    return headers[device_id_key]
