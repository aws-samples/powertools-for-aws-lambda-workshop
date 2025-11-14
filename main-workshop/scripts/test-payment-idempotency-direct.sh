#!/bin/bash

# Test Payment Idempotency Directly - Sends duplicate DriverAssigned events to EventBridge
# This bypasses the API and directly tests the payment processor's idempotency

set -e

# Configuration
EVENT_BUS_NAME=${EVENT_BUS_NAME:-"powertools-ride-workshop-event-bus"}
RIDE_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "ride-$(date +%s)-$$")
NUM_DUPLICATES=${1:-3}  # Default to 3 duplicate events
TEST_PAYLOAD_VALIDATION=${2:-false}  # Set to 'true' to test payload validation with price changes

if [ "$TEST_PAYLOAD_VALIDATION" = "true" ]; then
    echo "💰 Testing Payload Validation - Price Mismatch Detection"
else
    echo "💳 Testing Payment Processor Idempotency (Direct EventBridge)"
fi
echo "Event Bus: $EVENT_BUS_NAME"
echo "Ride ID: $RIDE_ID"
echo "Number of duplicate events: $NUM_DUPLICATES"
echo "Payload Validation Test: $TEST_PAYLOAD_VALIDATION"
echo "----------------------------------------"

echo ""
echo "📤 Sending $NUM_DUPLICATES duplicate DriverAssigned events..."
echo ""

# Base price for testing
BASE_PRICE=25.50

# Send multiple identical events
for i in $(seq 1 $NUM_DUPLICATES); do
    echo "Event #$i:"
    
    # Determine price based on test mode
    if [ "$TEST_PAYLOAD_VALIDATION" = "true" ]; then
        # Change price on events 3 and 5 to trigger validation exceptions
        if [ $i -eq 3 ]; then
            PRICE=32.00
            echo "  💥 Changing price to \$$PRICE (should trigger validation exception)"
        elif [ $i -eq 5 ]; then
            PRICE=28.75
            echo "  💥 Changing price to \$$PRICE (should trigger validation exception)"
        else
            PRICE=$BASE_PRICE
            echo "  ✓ Using base price \$$PRICE"
        fi
    else
        # Use same price for all events (standard idempotency test)
        PRICE=$BASE_PRICE
    fi
    
    # Create event with current timestamp (simulating real duplicate events)
    CURRENT_EVENT='{
      "eventType": "DriverAssigned",
      "rideId": "'$RIDE_ID'",
      "riderId": "rider-idempotency-test",
      "riderName": "Test User",
      "driverId": "driver-123",
      "driverName": "Test Driver",
      "estimatedPrice": '$PRICE',
      "paymentMethod": "credit-card",
      "correlationId": "'$RIDE_ID'",
      "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }'
    
    # Convert to JSON string for Detail field
    DETAIL_STRING=$(echo "$CURRENT_EVENT" | jq -c . | jq -R .)
    
    aws events put-events \
      --entries "[{
        \"Source\": \"driver-matching-service\",
        \"DetailType\": \"DriverAssigned\",
        \"Detail\": $DETAIL_STRING,
        \"EventBusName\": \"$EVENT_BUS_NAME\"
      }]" \
      --output json > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Event sent successfully"
    else
        echo "  ❌ Failed to send event"
    fi
    
    # Small delay between events
    sleep 0.5
done

echo ""
echo "----------------------------------------"
echo "📊 Test Complete!"
echo ""
echo "🔍 Verification Steps:"
echo ""
if [ "$TEST_PAYLOAD_VALIDATION" = "true" ]; then
    echo "Expected Results (Payload Validation Test):"
    echo "  ✅ Only 1 payment record (first event at \$$BASE_PRICE)"
    echo "  ✅ 2 validation exceptions logged (events #3 and #5 with different prices)"
    echo "  ✅ 2 successful cached responses (events #2 and #4 with same price)"
    echo ""
    echo "What Each Event Should Do:"
    echo "  Event #1: Price \$$BASE_PRICE → ✅ Processed (first request)"
    echo "  Event #2: Price \$$BASE_PRICE → ✅ Cached (duplicate, same price)"
    echo "  Event #3: Price \$32.00 → ❌ IdempotencyValidationException (price mismatch!)"
    echo "  Event #4: Price \$$BASE_PRICE → ✅ Cached (duplicate, same price)"
    echo "  Event #5: Price \$28.75 → ❌ IdempotencyValidationException (price mismatch!)"
    echo ""
    echo "Check Dashboard:"
    echo "  - 'PAYLOAD VALIDATION EXCEPTIONS' widget should show 2 exceptions"
else
    echo "Expected Results (Standard Idempotency Test):"
    echo "  ✅ Only 1 payment record in Payments table"
    echo "  ✅ 1 idempotency record with status=COMPLETED"
    echo "  ✅ Logs show $(($NUM_DUPLICATES - 1)) cached responses"
    echo ""
    echo "If you see multiple payments = ❌ Idempotency NOT working!"
fi
echo ""
echo "💡 Test Identifiers:"
echo "   Ride ID: $RIDE_ID"
echo "   Base Price: \$$BASE_PRICE"
echo "   Event Bus: $EVENT_BUS_NAME"
echo ""
echo "💡 Usage:"
echo "   Standard idempotency test: ./test-payment-idempotency-direct.sh 5"
echo "   Payload validation test:   ./test-payment-idempotency-direct.sh 5 true"
