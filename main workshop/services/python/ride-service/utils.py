import json
from typing import Any


class RouteHandler:
    """Helper class for creating API Gateway responses"""

    @staticmethod
    def created(data: Any) -> dict[str, Any]:
        """Create 201 Created response"""
        return RouteHandler.create_response(201, data)

    @staticmethod
    def bad_request(message: str) -> dict[str, Any]:
        """Create 400 Bad Request response"""
        return RouteHandler.create_response(400, {"error": message})

    @staticmethod
    def not_found(message: str) -> dict[str, Any]:
        """Create 404 Not Found response"""
        return RouteHandler.create_response(404, {"error": message})

    @staticmethod
    def handle_error() -> dict[str, Any]:
        """Create 500 Internal Server Error response"""
        return RouteHandler.create_response(500, {"error": "Internal Server Error"})

    @staticmethod
    def create_response(status_code: int, body: Any) -> dict[str, Any]:
        """Create API Gateway response"""
        return {"statusCode": status_code, "body": json.dumps(body)}
