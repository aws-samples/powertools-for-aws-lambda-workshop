#!/bin/bash

# Script to tail CloudWatch logs for all PowerTools Ride Workshop Lambda functions
# This provides live log streaming for debugging and monitoring

set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
LOG_PREFIX="/aws/lambda/powertools-ride-workshop-"

# Service names
SERVICES=(
    "ride-service"
    "driver-matching-service"
    "dynamic-pricing-service"
    "payment-processor"
    "payment-stream-processor"
    "ride-completion-service"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Tail CloudWatch logs for PowerTools Ride Workshop Lambda functions"
    echo ""
    echo "Options:"
    echo "  -s, --service <name>    Tail logs for specific service only"
    echo "                          (ride-service, driver-matching-service, dynamic-pricing-service,"
    echo "                          payment-processor, payment-stream-processor, ride-completion-service)"
    echo "  -f, --filter <pattern>  Filter logs by pattern (e.g., ERROR, correlation-id)"
    echo "  -l, --level <level>     Filter by log level (ERROR, WARN, INFO)"
    echo "  -c, --compact           Compact mode - show only timestamp, level, and message"
    echo "  -n, --sample <N>        Show only every Nth log line (e.g., -n 5 shows 1 in 5 logs)"
    echo "  -t, --since <time>      Start time (e.g., '5m', '1h', '2023-01-01T00:00:00')"
    echo "  -r, --region <region>   AWS region (default: $REGION)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                          # Tail all services"
    echo "  $0 -s ride-service                          # Tail only ride-service"
    echo "  $0 -l ERROR                                 # Show only ERROR logs"
    echo "  $0 -l WARN                                  # Show WARN and ERROR logs"
    echo "  $0 -c                                       # Compact output"
    echo "  $0 -n 10                                    # Show every 10th log (90% reduction)"
    echo "  $0 -s payment-processor -l ERROR            # Payment errors only"
    echo "  $0 -c -n 5                                  # Compact + sampled"
    exit 1
}

# Parse command line arguments
SERVICE=""
FILTER_PATTERN=""
SINCE=""
LOG_LEVEL=""
COMPACT=false
SAMPLE_RATE=1

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -f|--filter)
            FILTER_PATTERN="$2"
            shift 2
            ;;
        -l|--level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        -c|--compact)
            COMPACT=true
            shift
            ;;
        -n|--sample)
            SAMPLE_RATE="$2"
            shift 2
            ;;
        -t|--since)
            SINCE="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate service if specified
if [ -n "$SERVICE" ]; then
    VALID_SERVICE=false
    for s in "${SERVICES[@]}"; do
        if [ "$s" = "$SERVICE" ]; then
            VALID_SERVICE=true
            break
        fi
    done
    
    if [ "$VALID_SERVICE" = false ]; then
        echo -e "${RED}❌ Invalid service: $SERVICE${NC}"
        echo ""
        echo "Valid services:"
        for s in "${SERVICES[@]}"; do
            echo "  - $s"
        done
        exit 1
    fi
    
    SERVICES=("$SERVICE")
fi

echo -e "${CYAN}🔍 Tailing CloudWatch Logs${NC}"
echo -e "${CYAN}📍 Region: $REGION${NC}"
echo ""

# Check if log groups exist
echo -e "${YELLOW}Checking log groups...${NC}"
EXISTING_GROUPS=()
for service in "${SERVICES[@]}"; do
    LOG_GROUP="${LOG_PREFIX}${service}"
    if aws logs describe-log-groups \
        --log-group-name-prefix "$LOG_GROUP" \
        --region "$REGION" \
        --query "logGroups[?logGroupName=='$LOG_GROUP'].logGroupName" \
        --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
        echo -e "  ${GREEN}✓${NC} $LOG_GROUP"
        EXISTING_GROUPS+=("$LOG_GROUP")
    else
        echo -e "  ${RED}✗${NC} $LOG_GROUP (not found)"
    fi
done

if [ ${#EXISTING_GROUPS[@]} -eq 0 ]; then
    echo ""
    echo -e "${RED}❌ No log groups found. Make sure the services are deployed.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}📋 Tailing logs from ${#EXISTING_GROUPS[@]} service(s)...${NC}"
if [ -n "$FILTER_PATTERN" ]; then
    echo -e "${YELLOW}🔍 Filter: $FILTER_PATTERN${NC}"
fi
if [ -n "$LOG_LEVEL" ]; then
    echo -e "${YELLOW}📊 Level: $LOG_LEVEL and above${NC}"
fi
if [ "$COMPACT" = true ]; then
    echo -e "${YELLOW}📦 Mode: Compact${NC}"
fi
if [ "$SAMPLE_RATE" -gt 1 ]; then
    echo -e "${YELLOW}🎲 Sampling: 1 in $SAMPLE_RATE logs (~$((100 - 100/SAMPLE_RATE))% reduction)${NC}"
fi
if [ -n "$SINCE" ]; then
    echo -e "${YELLOW}⏰ Since: $SINCE${NC}"
fi
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo "----------------------------------------"
echo ""

# Build tail command options
TAIL_OPTIONS="--follow --format short --region $REGION"

if [ -n "$FILTER_PATTERN" ]; then
    TAIL_OPTIONS="$TAIL_OPTIONS --filter-pattern \"$FILTER_PATTERN\""
fi

if [ -n "$SINCE" ]; then
    TAIL_OPTIONS="$TAIL_OPTIONS --since $SINCE"
fi

# Function to check if log line matches level filter
matches_level() {
    local line=$1
    
    # If no level filter, show everything
    if [ -z "$LOG_LEVEL" ]; then
        return 0
    fi
    
    # Check for log level in the line (case insensitive)
    case "$LOG_LEVEL" in
        ERROR)
            echo "$line" | grep -qi "ERROR"
            return $?
            ;;
        WARN|WARNING)
            echo "$line" | grep -qiE "(WARN|ERROR)"
            return $?
            ;;
        INFO)
            echo "$line" | grep -qiE "(INFO|WARN|ERROR)"
            return $?
            ;;
        *)
            return 0
            ;;
    esac
}

# Function to format log line in compact mode
format_compact() {
    local line=$1
    
    # Try to extract JSON fields if it's a JSON log
    if echo "$line" | jq -e . >/dev/null 2>&1; then
        local timestamp=$(echo "$line" | jq -r '.timestamp // .time // "@timestamp" // ""' 2>/dev/null)
        local level=$(echo "$line" | jq -r '.level // .severity // ""' 2>/dev/null)
        local message=$(echo "$line" | jq -r '.message // .msg // ""' 2>/dev/null)
        
        if [ -n "$timestamp" ] && [ -n "$message" ]; then
            echo "[$timestamp] $level: $message"
            return
        fi
    fi
    
    # If not JSON or extraction failed, try to extract from plain text
    # Format: timestamp level: message
    if [[ "$line" =~ ([0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2}[^ ]*) ]]; then
        local timestamp="${BASH_REMATCH[1]}"
        local rest="${line#*$timestamp}"
        echo "[$timestamp]$rest"
    else
        echo "$line"
    fi
}

# Function to tail a single log group with colored prefix
tail_log_group() {
    local log_group=$1
    local color=$2
    local service_name=$(echo "$log_group" | sed "s|${LOG_PREFIX}||")
    local line_count=0
    
    eval "aws logs tail \"$log_group\" $TAIL_OPTIONS" 2>/dev/null | while IFS= read -r line; do
        # Apply sampling
        line_count=$((line_count + 1))
        if [ $((line_count % SAMPLE_RATE)) -ne 0 ]; then
            continue
        fi
        
        # Apply level filter
        if ! matches_level "$line"; then
            continue
        fi
        
        # Format output
        if [ "$COMPACT" = true ]; then
            formatted=$(format_compact "$line")
            echo -e "${color}[${service_name}]${NC} $formatted"
        else
            echo -e "${color}[${service_name}]${NC} $line"
        fi
    done
}

# If only one log group, tail it directly without prefix
if [ ${#EXISTING_GROUPS[@]} -eq 1 ]; then
    eval "aws logs tail \"${EXISTING_GROUPS[0]}\" $TAIL_OPTIONS"
else
    # For multiple log groups, tail each in parallel with colored prefixes
    COLORS=("$GREEN" "$BLUE" "$MAGENTA" "$CYAN" "$YELLOW" "$RED")
    COLOR_INDEX=0
    
    for log_group in "${EXISTING_GROUPS[@]}"; do
        COLOR="${COLORS[$COLOR_INDEX]}"
        COLOR_INDEX=$(( (COLOR_INDEX + 1) % ${#COLORS[@]} ))
        
        tail_log_group "$log_group" "$COLOR" &
    done
    
    # Wait for all background processes
    wait
fi
