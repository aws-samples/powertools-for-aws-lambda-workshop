#!/bin/bash

# Validate Chapter 2 - Structured Logging
# This script simulates the customer issue and validates structured logging improvements

set -e

# Configuration
API_GATEWAY_URL=${API_GATEWAY_URL:-"https://your-api-id.execute-api.region.amazonaws.com/prod"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

echo "🔍 Chapter 2: Structured Logging Workshop Scenario"
echo "================================================="
echo ""
echo "📋 Workshop Story:"
echo "Customers are complaining they can't book rides and get errors."
echo "Support team sees logs like 'Error in FunctionHandler: Header not found'"
echo "but can't understand what's causing the issue because logs lack context."
echo ""

# Test 1: Simulate the customer issue - wrong header causing error
echo "🚨 Test 1: Simulating Customer Issue (Wrong Header)..."
echo "Sending request with 'x-device' instead of 'x-device-id' header..."
CORRELATION_ID_ERROR="customer-issue-ch2-$(date +%s)"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_GATEWAY_URL/rides" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: $CORRELATION_ID_ERROR" \
  -H "x-device: android" \
  -d '{
    "riderId": "frustrated-customer-001",
    "riderName": "Frustrated Customer",
    "pickupLocation": {
      "address": "123 Customer St, San Francisco, CA",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destinationLocation": {
      "address": "456 Destination Ave, San Francisco, CA",
      "latitude": 37.7849,
      "longitude": -122.4094
    },
    "paymentMethod": "credit-card"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "500" ]; then
    echo "✅ Expected error occurred (HTTP $HTTP_CODE) - this is the customer issue!"
    echo "   Error response: $BODY"
    echo "   Correlation ID: $CORRELATION_ID_ERROR"
    echo ""
    echo "🎯 This error is what customers are experiencing!"
    echo "   The error occurs because 'x-device' header was sent instead of 'x-device-id'"
else
    echo "❌ Unexpected response (HTTP $HTTP_CODE)"
    echo "   Expected: 500 Internal Server Error due to wrong device header"
    echo "   Actual response: $BODY"
    echo ""
    echo "⚠️  This suggests the error handling might have been modified already."
fi

echo ""
echo "Waiting 10 seconds for error logs to propagate to CloudWatch..."
sleep 10

# Test 2: Multiple error requests to increase error count in dashboard
echo ""
echo "🔄 Test 2: Generating Multiple Errors for Dashboard Visibility..."
echo "Sending 5 more error requests to make the issue visible in the error counter widget..."

for i in {1..5}; do
    CORRELATION_ID_BATCH="batch-error-ch2-${i}-$(date +%s)"
    curl -s -X POST \
      "$API_GATEWAY_URL/rides" \
      -H "Content-Type: application/json" \
      -H "x-correlation-id: $CORRELATION_ID_BATCH" \
      -H "x-device: android" \
      -d '{
        "riderId": "batch-customer-'${i}'",
        "riderName": "Batch Test Customer '${i}'",
        "pickupLocation": {
          "address": "123 Batch St, San Francisco, CA",
          "latitude": 37.7749,
          "longitude": -122.4194
        },
        "destinationLocation": {
          "address": "456 Batch Ave, San Francisco, CA",
          "latitude": 37.7849,
          "longitude": -122.4094
        },
        "paymentMethod": "credit-card"
      }' > /dev/null
    
    echo "   Generated error $i/5 (Correlation ID: $CORRELATION_ID_BATCH)"
    sleep 1
done

echo ""
echo "✅ Generated 6 total error requests that should now be visible in your dashboard!"

echo ""
echo "Waiting 15 seconds for error logs to propagate..."
sleep 15

# Test 3: Create a successful ride request for comparison
echo ""
echo "✅ Test 3: Creating Successful Ride Request (Correct Header)..."
echo "This shows how the request should work when the correct header is provided..."
CORRELATION_ID_SUCCESS="success-ch2-$(date +%s)"

for i in {1..5}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "$API_GATEWAY_URL/rides" \
      -H "Content-Type: application/json" \
      -H "x-correlation-id: $CORRELATION_ID_SUCCESS" \
      -H "x-device-id: iphone" \
      -d '{
        "riderId": "happy-customer-001",
        "riderName": "Happy Customer",
        "pickupLocation": {
          "address": "789 Success St, San Francisco, CA",
          "latitude": 37.7649,
          "longitude": -122.4294
        },
        "destinationLocation": {
          "address": "101 Victory Ave, San Francisco, CA",
          "latitude": 37.7749,
          "longitude": -122.4094
        },
        "paymentMethod": "credit-card"
      }')
    sleep 1
done

for i in {1..5}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "$API_GATEWAY_URL/rides" \
      -H "Content-Type: application/json" \
      -H "x-correlation-id: $CORRELATION_ID_SUCCESS" \
      -H "x-device-id: android" \
      -d '{
        "riderId": "happy-customer-001",
        "riderName": "Happy Customer",
        "pickupLocation": {
          "address": "789 Success St, San Francisco, CA",
          "latitude": 37.7649,
          "longitude": -122.4294
        },
        "destinationLocation": {
          "address": "101 Victory Ave, San Francisco, CA",
          "latitude": 37.7749,
          "longitude": -122.4094
        },
        "paymentMethod": "credit-card"
      }')
    sleep 1
done

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
    RIDE_ID=$(echo "$BODY" | jq -r '.rideId' 2>/dev/null || echo "unknown")
    echo "✅ Successful ride created: $RIDE_ID"
    echo "   Correlation ID: $CORRELATION_ID_SUCCESS"
    echo "   Notice: This request used the correct 'x-device-id' header"
else
    echo "❌ Failed to create successful ride (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
fi

echo ""
echo "Waiting 15 seconds for success logs to propagate..."
sleep 15

# Test 4: Validation guidance for participants
echo ""
echo "🔧 DEBUGGING EXERCISE FOR PARTICIPANTS:"
echo "========================================"
echo ""

echo "💡 Manual Validation Steps for Chapter 2:"
echo ""
echo "1. 📋 CloudWatch Log Groups to Check:"
echo "   - /aws/lambda/powertools-ride-workshop-ride-service"
echo "   - /aws/lambda/powertools-ride-workshop-dynamic-pricing-service"
echo "   - /aws/lambda/powertools-ride-workshop-driver-matching-service"
echo "   - /aws/lambda/powertools-ride-workshop-payment-processor"
echo "   - /aws/lambda/powertools-ride-workshop-ride-completion-service"
echo ""

echo "2. 🔍 CloudWatch Log Insights Queries to Run:"
echo ""
echo "   Query 1 - Check for structured JSON logs:"
echo "   ----------------------------------------"
echo "   fields @timestamp, @message"
echo "   | filter CorrelationId = \"$CORRELATION_ID\""
echo "   | sort @timestamp"
echo ""
echo "   Expected: JSON-formatted log entries with structured fields"
echo ""

echo "   Query 2 - Validate service identification:"
echo "   ----------------------------------------"
echo "   fields @timestamp, Service, @message"
echo "   | filter CorrelationId = \"$CORRELATION_ID\""
echo "   | stats count() by Service"
echo ""
echo "   Expected: Entries for ride-service, dynamic-pricing-service, etc."
echo ""

echo "   Query 3 - Check business context logging:"
echo "   ----------------------------------------"
echo "   fields @timestamp, RideId, PaymentMethod, Service"
echo "   | filter CorrelationId = \"$CORRELATION_ID\""
echo "   | filter ispresent(RideId)"
echo ""
echo "   Expected: Business identifiers like RideId, PaymentMethod in logs"
echo ""

echo "3. ✅ Validation Checklist:"
echo ""
echo "   □ Logs are in JSON format (not plain text)"
echo "   □ Each log entry has a 'Service' field identifying the source"
echo "   □ Correlation ID appears in all related log entries"
echo "   □ Business context (RideId, PaymentMethod) is present"
echo "   □ Log levels (INFO, ERROR, WARNING) are properly set"
echo "   □ Timestamps are consistent across services"
echo ""

echo "4. 🚨 Common Issues to Look For:"
echo ""
echo "   ❌ Plain text logs instead of JSON"
echo "   ❌ Missing Service field in log entries"
echo "   ❌ Correlation ID not propagating between services"
echo "   ❌ Business context missing from logs"
echo "   ❌ Inconsistent log formatting between services"
echo ""

echo "5. 🔧 If Issues Found:"
echo ""
echo "   - Verify Functions.complete.cs files are deployed"
echo "   - Check that Powertools logging decorators are applied"
echo "   - Ensure Logger.AppendKey() calls are in place"
echo "   - Validate correlation ID header handling"
echo ""

echo "Test Data for Validation:"
echo "========================"
echo "Ride ID: $RIDE_ID"
echo "Correlation ID: $CORRELATION_ID"
echo "Test Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
echo ""

echo "🎯 Next Steps:"
echo "1. Run the CloudWatch Log Insights queries above"
echo "2. Verify all checklist items are satisfied"
echo "3. If validation passes, proceed to Chapter 3"
echo "4. If issues found, review the complete implementation files"