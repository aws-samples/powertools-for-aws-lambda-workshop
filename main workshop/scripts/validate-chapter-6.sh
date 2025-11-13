#!/bin/bash

# Validate Chapter 6 - Distributed Tracing
# This script validates that X-Ray tracing is working correctly

set -e

# Configuration
API_GATEWAY_URL=${API_GATEWAY_URL:-"https://your-api-id.execute-api.region.amazonaws.com/prod"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

echo "🗺️ Validating Chapter 6: Distributed Tracing"
echo "============================================="
echo ""

# Test 1: Create rides with different characteristics for tracing
echo "Test 1: Creating test rides for tracing validation..."

# Normal ride
echo "Creating normal ride..."
NORMAL_CORRELATION_ID="trace-normal-$(date +%s)"
NORMAL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_GATEWAY_URL/rides" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: $NORMAL_CORRELATION_ID" \
  -d '{
    "riderId": "trace-normal-rider",
    "riderName": "Normal Trace User",
    "pickupLocation": {
      "address": "100 Normal St, San Francisco, CA",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destinationLocation": {
      "address": "500 Normal Ave, San Francisco, CA",
      "latitude": 37.7849,
      "longitude": -122.4094
    },
    "paymentMethod": "credit-card"
  }')

NORMAL_HTTP_CODE=$(echo "$NORMAL_RESPONSE" | tail -n1)
if [ "$NORMAL_HTTP_CODE" = "201" ]; then
    NORMAL_RIDE_ID=$(echo "$NORMAL_RESPONSE" | head -n -1 | jq -r '.rideId' 2>/dev/null || echo "unknown")
    echo "✅ Normal ride created: $NORMAL_RIDE_ID"
else
    echo "❌ Failed to create normal ride"
fi

sleep 2

# SomeCompany Pay ride (for latency tracing)
echo "Creating SomeCompany Pay ride (latency test)..."
SomeCompany_CORRELATION_ID="trace-SomeCompany-$(date +%s)"
SomeCompany_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_GATEWAY_URL/rides" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: $SomeCompany_CORRELATION_ID" \
  -d '{
    "riderId": "trace-SomeCompany-rider",
    "riderName": "SomeCompany Pay Trace User",
    "pickupLocation": {
      "address": "200 SomeCompany St, San Francisco, CA",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destinationLocation": {
      "address": "600 SomeCompany Ave, San Francisco, CA",
      "latitude": 37.7849,
      "longitude": -122.4094
    },
    "paymentMethod": "somecompany-pay"
  }')

SomeCompany_HTTP_CODE=$(echo "$SomeCompany_RESPONSE" | tail -n1)
if [ "$SomeCompany_HTTP_CODE" = "201" ]; then
    SomeCompany_RIDE_ID=$(echo "$SomeCompany_RESPONSE" | head -n -1 | jq -r '.rideId' 2>/dev/null || echo "unknown")
    echo "✅ SomeCompany Pay ride created: $SomeCompany_RIDE_ID"
else
    echo "❌ Failed to create SomeCompany Pay ride"
fi

sleep 2

# Cash payment ride (for failure tracing)
echo "Creating cash payment ride (failure test)..."
CASH_CORRELATION_ID="trace-cash-$(date +%s)"
CASH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_GATEWAY_URL/rides" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: $CASH_CORRELATION_ID" \
  -d '{
    "riderId": "trace-cash-rider",
    "riderName": "Cash Payment Trace User",
    "pickupLocation": {
      "address": "300 Cash St, San Francisco, CA",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destinationLocation": {
      "address": "700 Cash Ave, San Francisco, CA",
      "latitude": 37.7849,
      "longitude": -122.4094
    },
    "paymentMethod": "cash"
  }')

CASH_HTTP_CODE=$(echo "$CASH_RESPONSE" | tail -n1)
if [ "$CASH_HTTP_CODE" = "201" ]; then
    CASH_RIDE_ID=$(echo "$CASH_RESPONSE" | head -n -1 | jq -r '.rideId' 2>/dev/null || echo "unknown")
    echo "✅ Cash payment ride created: $CASH_RIDE_ID"
else
    echo "❌ Failed to create cash payment ride"
fi

echo ""
echo "Waiting 30 seconds for traces to propagate and SomeCompany Pay processing to complete..."
sleep 30

# Validation instructions
echo ""
echo "💡 Manual Validation Steps for Chapter 6:"
echo ""

echo "1. 🗺️ X-Ray Service Map Validation:"
echo "   Navigate to: AWS X-Ray Console > Service Map"
echo "   Time Range: Last 5 minutes"
echo ""
echo "   Expected Service Map Components:"
echo "   ✅ API Gateway"
echo "   ✅ powertools-ride-workshop-RideService"
echo "   ✅ powertools-ride-workshop-DynamicPricingService"
echo "   ✅ powertools-ride-workshop-DriverMatchingService"
echo "   ✅ powertools-ride-workshop-PaymentProcessor"
echo "   ✅ powertools-ride-workshop-RideCompletionService"
echo "   ✅ EventBridge (connections between services)"
echo "   ✅ DynamoDB tables"
echo ""

echo "2. 🔍 Trace Analysis - Normal Ride:"
echo "   Search for traces with annotation: CorrelationId = \"$NORMAL_CORRELATION_ID\""
echo ""
echo "   Expected Trace Segments:"
echo "   ✅ API Gateway segment"
echo "   ✅ RideService segment with business annotations"
echo "   ✅ DynamicPricingService segment"
echo "   ✅ DriverMatchingService segment"
echo "   ✅ PaymentProcessor segment"
echo "   ✅ RideCompletionService segment"
echo ""
echo "   Expected Annotations in Segments:"
echo "   ✅ Service name"
echo "   ✅ RideId"
echo "   ✅ PaymentMethod"
echo "   ✅ CorrelationId"
echo ""

echo "3. ⏱️ Latency Analysis - SomeCompany Pay Ride:"
echo "   Search for traces with annotation: CorrelationId = \"$SomeCompany_CORRELATION_ID\""
echo ""
echo "   Expected Latency Patterns:"
echo "   ✅ PaymentProcessor segment should show ~5 second duration"
echo "   ✅ SomeCompany Pay verification subsegment visible"
echo "   ✅ Overall trace duration significantly higher than normal ride"
echo "   ✅ Service map shows increased latency for PaymentProcessor"
echo ""

echo "4. 🚨 Error Tracing - Cash Payment Ride:"
echo "   Search for traces with annotation: CorrelationId = \"$CASH_CORRELATION_ID\""
echo ""
echo "   Expected Error Patterns:"
echo "   ✅ Successful segments: RideService, DynamicPricingService"
echo "   ✅ Error/Warning in DriverMatchingService segment"
echo "   ✅ Error annotations showing cash payment restriction"
echo "   ✅ Trace shows where the failure occurred in the flow"
echo ""

echo "5. 📊 X-Ray Analytics Queries:"
echo ""
echo "   Query 1 - Service Performance:"
echo "   service(\"powertools-ride-workshop-PaymentProcessor\") { responsetime > 1 }"
echo ""
echo "   Query 2 - Error Analysis:"
echo "   service(\"powertools-ride-workshop-DriverMatchingService\") { error }"
echo ""
echo "   Query 3 - Business Context:"
echo "   annotation.PaymentMethod = \"somecompany-pay\""
echo ""

echo "6. ✅ Validation Checklist:"
echo ""
echo "   □ Service map shows all expected services and connections"
echo "   □ Traces contain business annotations (RideId, PaymentMethod)"
echo "   □ SomeCompany Pay traces show expected 5-second latency"
echo "   □ Cash payment traces show failure in driver matching"
echo "   □ Custom segments and subsegments are visible"
echo "   □ Error traces clearly show failure points"
echo "   □ Correlation IDs enable end-to-end request tracking"
echo ""

echo "7. 🚨 Common Issues to Look For:"
echo ""
echo "   ❌ Missing services in service map"
echo "   ❌ Traces without business annotations"
echo "   ❌ SomeCompany Pay latency not visible in traces"
echo "   ❌ Error traces not showing failure details"
echo "   ❌ Missing custom segments or subsegments"
echo ""

echo "8. 🔧 If Issues Found:"
echo ""
echo "   - Verify Functions.tracing.complete.cs files are deployed"
echo "   - Check that Tracing decorators are applied to all functions"
echo "   - Ensure Tracing.AddAnnotation() calls are in place"
echo "   - Validate X-Ray permissions for Lambda functions"
echo "   - Check that custom segments are properly created and closed"
echo ""

echo "Test Data for Validation:"
echo "========================"
echo "Normal Ride:"
echo "  Ride ID: $NORMAL_RIDE_ID"
echo "  Correlation ID: $NORMAL_CORRELATION_ID"
echo ""
echo "SomeCompany Pay Ride (Latency Test):"
echo "  Ride ID: $SomeCompany_RIDE_ID"
echo "  Correlation ID: $SomeCompany_CORRELATION_ID"
echo ""
echo "Cash Payment Ride (Error Test):"
echo "  Ride ID: $CASH_RIDE_ID"
echo "  Correlation ID: $CASH_CORRELATION_ID"
echo ""
echo "Test Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
echo ""

echo "🎯 Next Steps:"
echo "1. Open AWS X-Ray Console and navigate to Service Map"
echo "2. Search for traces using the correlation IDs above"
echo "3. Verify all checklist items are satisfied"
echo "4. Analyze latency patterns and error traces"
echo "5. If validation passes, proceed to Chapter 7"
echo "6. If issues found, review the tracing implementation files"