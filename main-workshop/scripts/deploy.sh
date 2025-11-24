#!/bin/bash
# Simple deployment script

set -e

DEPLOYMENT_TYPE=${1:-"infrastructure"}
LANGUAGE=${2:-""}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Deploying..."

cd "$PROJECT_ROOT/infrastructure"

# Function to check if infrastructure stack exists
check_infrastructure() {
    if ! aws cloudformation describe-stacks --stack-name "powertoolsworkshopinfra" >/dev/null 2>&1; then
        echo "❌ Infrastructure stack not found!"
        echo "Please deploy infrastructure first:"
        echo "  make deploy-infra"
        exit 1
    fi
}

# Build services first if deploying services
if [ "$DEPLOYMENT_TYPE" = "services" ]; then
    echo "Building services..."
    bash "$PROJECT_ROOT/scripts/build.sh" "$LANGUAGE"
fi

# Set CDK context
CDK_ARGS="--require-approval never"

if [ -n "$LANGUAGE" ]; then
    CDK_ARGS="$CDK_ARGS --context language=$LANGUAGE"
fi

CDK_ARGS="$CDK_ARGS --context deploymentType=$DEPLOYMENT_TYPE"

case "$DEPLOYMENT_TYPE" in
    "infrastructure")
        echo "Deploying infrastructure..."
        npx cdk deploy powertoolsworkshopinfra $CDK_ARGS --outputs-file "$PROJECT_ROOT/infrastructure/cdk.out/params-infrastructure.json"
        ;;
    "ide")
        echo "Deploying IDE stack..."
        GIT_REPO=${GIT_REPO_URL:-"https://github.com/aws-samples/powertools-for-aws-lambda-workshop"}
        echo "Using Git repository: $GIT_REPO"
        npx cdk deploy powertoolsworkshopide $CDK_ARGS --parameters GitRepoUrl=$GIT_REPO --outputs-file "$PROJECT_ROOT/infrastructure/cdk.out/params-ide.json"
        ;;
    "load-generator")
        check_infrastructure
        echo "Deploying Load generator stack..."
        
        # Check if S3 bucket is provided for Docker image
        if [ -n "$ASSET_BUCKET" ] && [ -n "$DOCKER_IMAGE_S3_KEY" ]; then
            echo "Using Docker image from S3: s3://$ASSET_BUCKET/$DOCKER_IMAGE_S3_KEY"
            CDK_ARGS="$CDK_ARGS --context assetBucket=$ASSET_BUCKET --context dockerImageS3Key=$DOCKER_IMAGE_S3_KEY"
        else
            echo "Using local Docker image tarball"
        fi
        
        npx cdk deploy powertoolsworkshopload $CDK_ARGS --outputs-file "$PROJECT_ROOT/infrastructure/cdk.out/params-load-generator.json"
        ;;
    "services")
        check_infrastructure
        
        # Check if services stack exists and is in a good state
        STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "powertoolsworkshopservices" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
        
        case "$STACK_STATUS" in
            "DOES_NOT_EXIST")
                echo "Services stack doesn't exist, creating with CloudFormation..."
                echo "Deploying $LANGUAGE services..."
                npx cdk deploy powertoolsworkshopservices $CDK_ARGS --outputs-file "$PROJECT_ROOT/infrastructure/cdk.out/params-services.json"
                ;;
            "CREATE_COMPLETE"|"UPDATE_COMPLETE")
                echo "Services stack exists and is healthy, using hotswap with fallback..."
                echo "Deploying $LANGUAGE services..."
                npx cdk deploy powertoolsworkshopservices $CDK_ARGS --hotswap-fallback --outputs-file "$PROJECT_ROOT/infrastructure/cdk.out/params-services.json"
                ;;
            *)
                echo "Services stack exists but is in state: $STACK_STATUS"
                echo "Using CloudFormation deployment for safety..."
                echo "Deploying $LANGUAGE services..."
                npx cdk deploy powertoolsworkshopservices $CDK_ARGS --outputs-file "$PROJECT_ROOT/infrastructure/cdk.out/params-services.json"
                ;;
        esac
        ;;
esac

echo "✅ Deployment completed!"