#!/bin/bash

# Script to check the status of running Load Generators
set -e

echo "🔍 Checking Load Generator Status..."
echo ""

# Get cluster name
CLUSTER_NAME=$(aws cloudformation list-exports \
    --query "Exports[?Name=='LoadGeneratorClusterName'].Value" \
    --output text 2>/dev/null)

if [ -z "$CLUSTER_NAME" ] || [ "$CLUSTER_NAME" = "None" ]; then
    echo "❌ Load generator stack not found. Please deploy it first:"
    echo "   make deploy-load-generator"
    exit 1
fi

echo "📦 Cluster: $CLUSTER_NAME"
echo ""

# List running tasks
echo "🏃 Running Tasks:"
RUNNING_TASKS=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --desired-status RUNNING \
    --query 'taskArns' \
    --output text)

if [ -z "$RUNNING_TASKS" ]; then
    echo "   No running tasks"
else
    for TASK_ARN in $RUNNING_TASKS; do
        TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
        echo "   - $TASK_ID"
        
        # Get task details
        TASK_INFO=$(aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks "$TASK_ARN" \
            --query 'tasks[0].[lastStatus,createdAt,cpu,memory]' \
            --output text)
        
        echo "     Status: $(echo $TASK_INFO | awk '{print $1}')"
        echo "     Started: $(echo $TASK_INFO | awk '{print $2}')"
        echo "     CPU: $(echo $TASK_INFO | awk '{print $3}')"
        echo "     Memory: $(echo $TASK_INFO | awk '{print $4}')"
        echo ""
    done
fi

# List stopped tasks (last 5)
echo "🛑 Recently Stopped Tasks:"
STOPPED_TASKS=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --desired-status STOPPED \
    --max-items 5 \
    --query 'taskArns' \
    --output text)

if [ -z "$STOPPED_TASKS" ]; then
    echo "   No stopped tasks"
else
    for TASK_ARN in $STOPPED_TASKS; do
        TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
        echo "   - $TASK_ID"
        
        # Get task details
        TASK_INFO=$(aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks "$TASK_ARN" \
            --query 'tasks[0].[lastStatus,stoppedAt,stoppedReason]' \
            --output text)
        
        echo "     Status: $(echo $TASK_INFO | awk '{print $1}')"
        echo "     Stopped: $(echo $TASK_INFO | awk '{print $2}')"
        REASON=$(echo $TASK_INFO | cut -f3-)
        if [ ! -z "$REASON" ]; then
            echo "     Reason: $REASON"
        fi
        echo ""
    done
fi

# Show cluster metrics
echo "📊 Cluster Metrics:"
CLUSTER_INFO=$(aws ecs describe-clusters \
    --clusters "$CLUSTER_NAME" \
    --query 'clusters[0].[runningTasksCount,pendingTasksCount,activeServicesCount]' \
    --output text)

echo "   Running Tasks: $(echo $CLUSTER_INFO | awk '{print $1}')"
echo "   Pending Tasks: $(echo $CLUSTER_INFO | awk '{print $2}')"
echo "   Active Services: $(echo $CLUSTER_INFO | awk '{print $3}')"
echo ""

# Show logs command
echo "📋 View Logs:"
echo "   aws logs tail /aws/ecs/powertools-ride-workshop-load-generator --follow"
echo ""

# Show how to stop tasks
if [ ! -z "$RUNNING_TASKS" ]; then
    echo "🛑 To stop a running task:"
    for TASK_ARN in $RUNNING_TASKS; do
        TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
        echo "   aws ecs stop-task --cluster $CLUSTER_NAME --task $TASK_ID"
    done
fi
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "🔍 Checking Load Generator Status..."
echo "📍 Region: $REGION"
echo ""

# Get cluster name
CLUSTER_NAME=$(aws cloudformation list-exports \
    --query "Exports[?Name=='LoadGeneratorClusterName'].Value" \
    --output text \
    --region "$REGION" 2>/dev/null)

if [ -z "$CLUSTER_NAME" ] || [ "$CLUSTER_NAME" = "None" ]; then
    echo "❌ Load generator stack not found. Please deploy it first:"
    echo "   make deploy-load-generator"
    exit 1
fi

echo "📦 Cluster: $CLUSTER_NAME"
echo ""

# List running tasks
echo "🏃 Running Tasks:"
RUNNING_TASKS=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --desired-status RUNNING \
    --region "$REGION" \
    --query 'taskArns' \
    --output text)

if [ -z "$RUNNING_TASKS" ]; then
    echo "   No running tasks"
else
    for TASK_ARN in $RUNNING_TASKS; do
        TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
        echo "   - $TASK_ID"
        
        # Get task details
        TASK_INFO=$(aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks "$TASK_ARN" \
            --region "$REGION" \
            --query 'tasks[0].[lastStatus,createdAt,cpu,memory]' \
            --output text)
        
        echo "     Status: $(echo $TASK_INFO | awk '{print $1}')"
        echo "     Started: $(echo $TASK_INFO | awk '{print $2}')"
        echo "     CPU: $(echo $TASK_INFO | awk '{print $3}')"
        echo "     Memory: $(echo $TASK_INFO | awk '{print $4}')"
        echo ""
    done
fi

# List stopped tasks (last 5)
echo "🛑 Recently Stopped Tasks:"
STOPPED_TASKS=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --desired-status STOPPED \
    --region "$REGION" \
    --max-items 5 \
    --query 'taskArns' \
    --output text)

if [ -z "$STOPPED_TASKS" ]; then
    echo "   No stopped tasks"
else
    for TASK_ARN in $STOPPED_TASKS; do
        TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
        echo "   - $TASK_ID"
        
        # Get task details
        TASK_INFO=$(aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks "$TASK_ARN" \
            --region "$REGION" \
            --query 'tasks[0].[lastStatus,stoppedAt,stoppedReason]' \
            --output text)
        
        echo "     Status: $(echo $TASK_INFO | awk '{print $1}')"
        echo "     Stopped: $(echo $TASK_INFO | awk '{print $2}')"
        REASON=$(echo $TASK_INFO | cut -f3-)
        if [ ! -z "$REASON" ]; then
            echo "     Reason: $REASON"
        fi
        echo ""
    done
fi

# Show cluster metrics
echo "📊 Cluster Metrics:"
CLUSTER_INFO=$(aws ecs describe-clusters \
    --clusters "$CLUSTER_NAME" \
    --region "$REGION" \
    --query 'clusters[0].[runningTasksCount,pendingTasksCount,activeServicesCount]' \
    --output text)

echo "   Running Tasks: $(echo $CLUSTER_INFO | awk '{print $1}')"
echo "   Pending Tasks: $(echo $CLUSTER_INFO | awk '{print $2}')"
echo "   Active Services: $(echo $CLUSTER_INFO | awk '{print $3}')"
echo ""

# Show logs command
echo "📋 View Logs:"
echo "   aws logs tail /aws/ecs/powertools-ride-workshop-load-generator --follow --region $REGION"
echo ""

# Show how to stop tasks
if [ ! -z "$RUNNING_TASKS" ]; then
    echo "🛑 To stop a running task:"
    for TASK_ARN in $RUNNING_TASKS; do
        TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
        echo "   aws ecs stop-task --cluster $CLUSTER_NAME --task $TASK_ID --region $REGION"
    done
fi
