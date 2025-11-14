#!/usr/bin/env bash

# Test Batch Processing Failures - Demonstrates cascade failures before implementing BatchProcessor
# This script directly writes payment records to DynamoDB to trigger DynamoDB Streams
# and demonstrate how failed records cause the entire batch to fail and retry

set -e

# Ensure we're using bash 4+ for associative arrays, or use workaround
if [ "${BASH_VERSINFO:-0}" -lt 4 ]; then
    USE_WORKAROUND=true
else
    USE_WORKAROUND=false
fi

# Configuration
PAYMENTS_TABLE_NAME=${PAYMENTS_TABLE_NAME:-"powertools-ride-workshop-Payments"}
NUM_RECORDS=${1:-10}  # Default to 10 records in batch
DURATION_SECONDS=${2:-60}  # How long to run the test (default: 60 seconds)
FAILURE_TYPE=${3:-"POISON"}  # Type of failure: POISON, INTERMITTENT, TIMEOUT, INVALID_AMOUNT, MISSING_FIELDS
FAILURE_RATE=${4:-20}  # Percentage of records that should fail (default: 20%)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 BATCH PROCESSING FAILURE TEST - Demonstrating Cascade Failures"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  DynamoDB Table: $PAYMENTS_TABLE_NAME"
echo "  Records per Batch: $NUM_RECORDS"
echo "  Test Duration: ${DURATION_SECONDS} seconds"
echo "  Failure Type: $FAILURE_TYPE"
echo "  Failure Rate: ${FAILURE_RATE}%"
echo ""
echo -e "${YELLOW}⚠️  This test demonstrates the PROBLEM (before BatchProcessor):${NC}"
echo "  - Failed records will cause the ENTIRE batch to fail"
echo "  - All records (including successful ones) will be retried"
echo "  - Records after failures won't be processed initially"
echo "  - System becomes unstable with infinite retry loops"
echo "  - Multiple failures per batch increase the problem"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Calculate end time
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_SECONDS))
BATCH_COUNT=0

echo -e "${BLUE}⏱️  Test will run until: $(date -r $END_TIME)${NC}"
echo ""

# Function to generate a GUID
generate_guid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        # Fallback: generate a pseudo-GUID using /dev/urandom
        cat /dev/urandom | LC_ALL=C tr -dc 'a-f0-9' | fold -w 32 | head -n 1 | sed -e 's/\(........\)\(....\)\(....\)\(....\)\(............\)/\1-\2-\3-\4-\5/'
    fi
}

# Function to create a payment record
create_payment_record() {
    local record_num=$1
    local should_fail=$2
    local failure_type=$3
    
    # Generate GUIDs for this record
    local payment_guid=$(generate_guid)
    local ride_guid=$(generate_guid)
    local payment_id="$payment_guid"
    local ride_id="$ride_guid"
    
    # Determine if this record should trigger a failure
    if [ "$should_fail" = "true" ]; then
        case $failure_type in
            "POISON")
                # FAILURE SCENARIO 2: Poison record (always fails)
                local poison_guid=$(generate_guid)
                payment_id="POISON-${poison_guid}"
                echo -e "  ${RED}💀 Record #${record_num}: #${payment_id} POISON RECORD (will always fail)${NC}"
                ;;
            "INVALID_AMOUNT")
                # FAILURE SCENARIO 5: Invalid amount
                echo -e "  ${RED}💥 Record #${record_num}: #${payment_id} INVALID AMOUNT (will fail validation)${NC}"
                ;;
            "MISSING_FIELDS")
                # FAILURE SCENARIO 4: Missing required fields
                echo -e "  ${RED}💥 Record #${record_num}: #${payment_id} MISSING FIELDS (will fail validation)${NC}"
                ;;
            *)
                echo -e "  ${RED}❌ Record #${record_num}: FAILURE TRIGGER${NC}"
                ;;
        esac
    else
        echo -e "  ${GREEN}✓ Record #${record_num}: #${payment_id} Valid payment record${NC}"
    fi
    
    # Store payment_id for later use in update function
    if [ "$USE_WORKAROUND" = true ]; then
        eval "PAYMENT_ID_${record_num}='${payment_id}'"
    else
        PAYMENT_IDS[$record_num]="$payment_id"
    fi
    
    # Create the payment record in DynamoDB
    # First, create with status "pending"
    if [ "$failure_type" = "INVALID_AMOUNT" ] && [ "$should_fail" = "true" ]; then
        # Invalid amount for failure scenario
        aws dynamodb put-item \
            --table-name "$PAYMENTS_TABLE_NAME" \
            --item "{
                \"paymentId\": {\"S\": \"$payment_id\"},
                \"rideId\": {\"S\": \"$ride_id\"},
                \"riderId\": {\"S\": \"rider-batch-test\"},
                \"driverId\": {\"S\": \"driver-batch-test\"},
                \"amount\": {\"S\": \"INVALID\"},
                \"paymentMethod\": {\"S\": \"credit-card\"},
                \"status\": {\"S\": \"pending\"},
                \"transactionId\": {\"S\": \"txn-$(generate_guid)\"},
                \"correlationId\": {\"S\": \"$BATCH_ID\"},
                \"createdAt\": {\"S\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}
            }" \
            --return-consumed-capacity NONE \
            --output json > /dev/null
    elif [ "$failure_type" = "MISSING_FIELDS" ] && [ "$should_fail" = "true" ]; then
        # Missing required fields for failure scenario
        aws dynamodb put-item \
            --table-name "$PAYMENTS_TABLE_NAME" \
            --item "{
                \"paymentId\": {\"S\": \"$payment_id\"},
                \"status\": {\"S\": \"pending\"},
                \"createdAt\": {\"S\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}
            }" \
            --return-consumed-capacity NONE \
            --output json > /dev/null
    else
        # Normal record
        aws dynamodb put-item \
            --table-name "$PAYMENTS_TABLE_NAME" \
            --item "{
                \"paymentId\": {\"S\": \"$payment_id\"},
                \"rideId\": {\"S\": \"$ride_id\"},
                \"riderId\": {\"S\": \"rider-batch-test\"},
                \"driverId\": {\"S\": \"driver-batch-test\"},
                \"amount\": {\"N\": \"25.50\"},
                \"paymentMethod\": {\"S\": \"credit-card\"},
                \"status\": {\"S\": \"pending\"},
                \"transactionId\": {\"S\": \"txn-$(generate_guid)\"},
                \"correlationId\": {\"S\": \"$BATCH_ID\"},
                \"createdAt\": {\"S\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}
            }" \
            --return-consumed-capacity NONE \
            --output json > /dev/null
    fi
    
    # Small delay to ensure records are created in sequence
    sleep 0.1
}

# Function to update payment status (triggers DynamoDB Stream)
update_payment_status() {
    local record_num=$1
    
    # Get the payment_id from storage
    if [ "$USE_WORKAROUND" = true ]; then
        local payment_id=$(eval echo "\$PAYMENT_ID_${record_num}")
    else
        local payment_id="${PAYMENT_IDS[$record_num]}"
    fi
    
    # Update status from "pending" to "completed" (this triggers the stream)
    aws dynamodb update-item \
        --table-name "$PAYMENTS_TABLE_NAME" \
        --key "{\"paymentId\": {\"S\": \"$payment_id\"}}" \
        --update-expression "SET #status = :completed" \
        --expression-attribute-names "{\"#status\": \"status\"}" \
        --expression-attribute-values "{\":completed\": {\"S\": \"completed\"}}" \
        --return-consumed-capacity NONE \
        --output json > /dev/null
    
    # Small delay between updates to simulate batch arrival
    sleep 0.02
}

# Main test loop - run for specified duration
while [ $(date +%s) -lt $END_TIME ]; do
    BATCH_COUNT=$((BATCH_COUNT + 1))
    CURRENT_TIME=$(date +%s)
    REMAINING_TIME=$((END_TIME - CURRENT_TIME))
    
    # Generate a unique batch ID for tracking (using GUID)
    BATCH_ID=$(generate_guid)
    
    # Initialize storage for payment IDs
    if [ "$USE_WORKAROUND" = false ]; then
        declare -A PAYMENT_IDS
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}📦 Batch #${BATCH_COUNT} - ID: $BATCH_ID${NC}"
    echo -e "${BLUE}⏱️  Time remaining: ${REMAINING_TIME}s${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Randomly determine which records will fail based on failure rate
    declare -a FAILURE_POSITIONS=()
    for i in $(seq 1 $NUM_RECORDS); do
        # Generate random number between 1-100
        RANDOM_NUM=$((RANDOM % 100 + 1))
        if [ $RANDOM_NUM -le $FAILURE_RATE ]; then
            FAILURE_POSITIONS+=($i)
        fi
    done
    
    # Ensure at least one failure if failure rate > 0
    if [ ${#FAILURE_POSITIONS[@]} -eq 0 ] && [ $FAILURE_RATE -gt 0 ]; then
        FAILURE_POSITIONS+=($((RANDOM % NUM_RECORDS + 1)))
    fi
    
    echo -e "${BLUE}📝 Step 1: Creating $NUM_RECORDS payment records...${NC}"
    echo -e "${YELLOW}   Failures will occur at positions: ${FAILURE_POSITIONS[*]}${NC}"
    echo ""
    
    # Create all payment records first
    for i in $(seq 1 $NUM_RECORDS); do
        should_fail="false"
        # Check if this position should fail
        for fail_pos in "${FAILURE_POSITIONS[@]}"; do
            if [ $i -eq $fail_pos ]; then
                should_fail="true"
                break
            fi
        done
        create_payment_record $i $should_fail $FAILURE_TYPE
    done
    
    echo ""
    echo -e "${BLUE}⏳ Waiting 2 seconds before triggering status updates...${NC}"
    sleep 2
    echo ""
    
    echo -e "${BLUE}🔄 Step 2: Updating payment statuses to trigger DynamoDB Streams...${NC}"
    echo ""
    
    # Update all payment statuses (this triggers the stream in a batch)
    for i in $(seq 1 $NUM_RECORDS); do
        should_fail="false"
        # Check if this position should fail
        for fail_pos in "${FAILURE_POSITIONS[@]}"; do
            if [ $i -eq $fail_pos ]; then
                should_fail="true"
                echo -e "  ${RED}💥 Updating Record #${i} (FAILURE TRIGGER)${NC}"
                break
            fi
        done
        
        if [ "$should_fail" = "false" ]; then
            echo -e "  ${GREEN}✓ Updating Record #${i}${NC}"
        fi
        
        update_payment_status $i
    done
    
    echo ""
    echo -e "${GREEN}✅ Batch #${BATCH_COUNT} created and triggered!${NC}"
    echo -e "${YELLOW}   Failed records: ${#FAILURE_POSITIONS[@]} out of ${NUM_RECORDS}${NC}"
    echo ""
    
    # Small delay between batches
    sleep 3
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Test completed! Generated ${BATCH_COUNT} batches over ${DURATION_SECONDS} seconds${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}🔍 What to expect (WITHOUT BatchProcessor):${NC}"
echo ""
echo "  For each batch with failures:"
echo ""
echo "  Batch Processing Attempt #1:"
echo -e "    ${GREEN}✅ Valid records before first failure: Will process successfully${NC}"
echo -e "    ${RED}❌ First failed record: FAILS → Throws exception${NC}"
echo -e "    ${YELLOW}⏹️  Remaining records: Never processed (blocked by failure)${NC}"
echo -e "    ${RED}💥 Result: ENTIRE BATCH FAILS${NC}"
echo ""
echo "  Batch Processing Attempt #2 (Retry):"
echo -e "    ${YELLOW}♻️  Previously successful records: REPROCESSED (waste of resources)${NC}"
echo -e "    ${RED}❌ Failed record(s): FAIL AGAIN${NC}"
echo -e "    ${YELLOW}⏹️  Records after failures: Still never processed${NC}"
echo -e "    ${RED}💥 Result: ENTIRE BATCH FAILS AGAIN${NC}"
echo ""
echo -e "  ${RED}� Thiss continues indefinitely for each batch...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📊 Verification Steps:${NC}"
echo ""
echo "1. Check CloudWatch Logs:"
echo "   Log Group: /aws/lambda/powertools-ride-workshop-payment-stream-processor"
echo ""
echo "   Look for:"
echo "   - 'BATCH START: Processing X DynamoDB stream records'"
echo "   - 'RECORD SUCCESS: Completed record X' (for records before failure)"
echo "   - 'FAILURE: Failed to process record' (for the poison record)"
echo "   - Lambda function error/exception"
echo "   - Multiple retry attempts with same records"
echo ""
echo "2. Check Lambda Metrics:"
echo "   - Function errors should increase"
echo "   - Invocations should show multiple retries"
echo "   - Duration may be high due to retries"
echo ""
echo "3. Check DynamoDB Streams:"
echo "   - Iterator age will increase (records stuck in retry)"
echo "   - Same records being reprocessed multiple times"
echo ""
echo "4. Check Module 3 Dashboard:"
echo "   Navigate to: Module 3: Batch Processing Dashboard"
echo "   - Widget 1: Batch Failure Cascade (Before)"
echo "   - Should show entire batch failing"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}💡 Test Summary:${NC}"
echo "   Total Batches Generated: $BATCH_COUNT"
echo "   Test Duration: ${DURATION_SECONDS} seconds"
echo "   Table: $PAYMENTS_TABLE_NAME"
echo "   Records per Batch: $NUM_RECORDS"
echo "   Failure Type: $FAILURE_TYPE"
echo "   Failure Rate: ${FAILURE_RATE}%"
echo ""
echo -e "${BLUE}💡 Usage Examples:${NC}"
echo "   Default test (10 records/batch, 60 seconds, POISON type, 20% failure rate):"
echo "     ./test-batch-processing-failures.sh"
echo ""
echo "   Run for 5 minutes with 15 records per batch:"
echo "     ./test-batch-processing-failures.sh 15 300"
echo ""
echo "   Run for 2 minutes with different failure types:"
echo "     ./test-batch-processing-failures.sh 10 120 POISON"
echo "     ./test-batch-processing-failures.sh 10 120 INVALID_AMOUNT"
echo "     ./test-batch-processing-failures.sh 10 120 MISSING_FIELDS"
echo ""
echo "   Custom failure rate (30% of records will fail):"
echo "     ./test-batch-processing-failures.sh 10 60 POISON 30"
echo ""
echo "   One hour stress test with high failure rate:"
echo "     ./test-batch-processing-failures.sh 20 3600 POISON 40"
echo ""
echo -e "${YELLOW}⚠️  Remember: This demonstrates the PROBLEM. After implementing${NC}"
echo -e "${YELLOW}   the [BatchProcessor] attribute, run this test again to see${NC}"
echo -e "${YELLOW}   how fault isolation prevents cascade failures!${NC}"
echo ""
