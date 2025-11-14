#!/bin/bash

# Create Normal Ride - Basic successful ride creation
# This script creates a standard ride request that should succeed

set -e

# Configuration
API_GATEWAY_URL=${API_GATEWAY_URL:-"https://your-api-id.execute-api.region.amazonaws.com/prod"}
CORRELATION_ID=$(uuidgen 2>/dev/null || echo "corr-$(date +%s)-$$")

echo "🚗 Creating Normal Ride"
echo "API URL: $API_GATEWAY_URL"
echo "Correlation ID: $CORRELATION_ID"
echo "----------------------------------------"

# Create ride request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_GATEWAY_URL/rides" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: $CORRELATION_ID" \
  -H "x-device-id: iphone" \
  -d '{
    "riderId": "rider-'$(date +%s)'",
    "riderName": "Alice Johnson",
    "pickupLocation": {
      "address": "123 Market St, San Francisco, CA",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destinationLocation": {
      "address": "456 Mission St, San Francisco, CA", 
      "latitude": 37.7849,
      "longitude": -122.4094
    },
    "paymentMethod": "credit-card"
  }')

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Normal ride created successfully!"
    
    # Extract ride ID for follow-up operations
    RIDE_ID=$(echo "$BODY" | jq -r '.rideId' 2>/dev/null || echo "unknown")
    echo "Ride ID: $RIDE_ID"
    echo "Correlation ID: $CORRELATION_ID"
    echo ""
    echo "💡 Use this correlation ID to trace the request through CloudWatch logs:"
    echo "   fields @timestamp, @message | filter CorrelationId = \"$CORRELATION_ID\" | sort @timestamp"
else
    echo "❌ Failed to create normal ride"
    exit 1
fi