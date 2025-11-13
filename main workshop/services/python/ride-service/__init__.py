# Ride Service - Main API entry point for ride lifecycle management
#
# This service:
# - Handles ride creation requests via API Gateway
# - Manages ride lifecycle from creation to completion
# - Publishes RideCreated events to EventBridge for service coordination
# - Stores ride data in DynamoDB with status tracking
# - Provides health checks and service status monitoring
