#!/bin/bash
# IDE deployment script - directly updates Lambda functions without CDK
# This script is designed to run inside the Web IDE environment

set -e

LANGUAGE=${1:-""}
SERVICE=${2:-""}  # Optional: deploy specific service only
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if [ -z "$LANGUAGE" ]; then
    echo "❌ Language must be specified"
    echo "Usage: $0 <language> [service-name]"
    echo "Example: $0 typescript"
    echo "Example: $0 typescript ride-service"
    exit 1
fi

echo "🚀 IDE Deployment for $LANGUAGE services..."

# Function name mapping
declare -A FUNCTION_NAMES=(
    ["ride-service"]="powertools-ride-workshop-ride-service"
    ["driver-matching-service"]="powertools-ride-workshop-driver-matching-service"
    ["dynamic-pricing-service"]="powertools-ride-workshop-dynamic-pricing-service"
    ["payment-processor"]="powertools-ride-workshop-payment-processor"
    ["payment-stream-processor"]="powertools-ride-workshop-payment-stream-processor"
    ["ride-completion-service"]="powertools-ride-workshop-ride-completion-service"
)

# Build the services first
echo "📦 Building $LANGUAGE services..."
bash "$PROJECT_ROOT/scripts/build.sh" "$LANGUAGE"

# Function to update a Lambda function
update_lambda() {
    local service_name=$1
    local service_path=$2
    local function_name=${FUNCTION_NAMES[$service_name]}
    
    if [ -z "$function_name" ]; then
        echo "⚠️  Unknown service: $service_name"
        return 1
    fi
    
    echo "📤 Updating $function_name..."
    
    # Create temp directory for packaging
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    case "$LANGUAGE" in
        "typescript")
            # Package TypeScript service
            cd "$service_path"
            cp -r dist/* "$temp_dir/"
            cp -r node_modules "$temp_dir/"
            cp package.json "$temp_dir/"
            ;;
        "python")
            # Package Python service
            cd "$service_path"
            cp -r *.py "$temp_dir/" 2>/dev/null || true
            cp -r src/* "$temp_dir/" 2>/dev/null || true
            # Python dependencies are in a layer, so we don't need to package them
            ;;
        "dotnet")
            # Package .NET service
            cd "$service_path"
            if [ -d "publish" ]; then
                cp -r publish/* "$temp_dir/"
            else
                echo "❌ No publish directory found. Run build first."
                return 1
            fi
            ;;
        "java")
            # Package Java service
            cd "$service_path"
            if [ -f "target/function.jar" ]; then
                cp target/function.jar "$temp_dir/"
            else
                echo "❌ No function.jar found. Run build first."
                return 1
            fi
            ;;
    esac
    
    # Create zip file
    cd "$temp_dir"
    zip -r -q function.zip .
    
    # Update Lambda function
    aws lambda update-function-code \
        --function-name "$function_name" \
        --zip-file fileb://function.zip \
        --no-cli-pager > /dev/null
    
    echo "✅ Updated $function_name"
}

# Deploy services
cd "$PROJECT_ROOT/services/$LANGUAGE"

if [ -n "$SERVICE" ]; then
    # Deploy specific service
    if [ -d "$SERVICE" ]; then
        update_lambda "$SERVICE" "$PROJECT_ROOT/services/$LANGUAGE/$SERVICE"
    else
        echo "❌ Service not found: $SERVICE"
        exit 1
    fi
else
    # Deploy all services for the language
    for service_dir in */; do
        service_name=${service_dir%/}
        if [ -d "$service_name" ]; then
            update_lambda "$service_name" "$PROJECT_ROOT/services/$LANGUAGE/$service_name"
        fi
    done
fi

echo ""
echo "✅ Deployment completed!"
echo ""
echo "💡 Tip: To deploy a specific service, use:"
echo "   bash scripts/ide-deploy.sh $LANGUAGE <service-name>"
