#!/bin/bash
# Check IDE status and help debug connection issues

set -e

echo "🔍 Checking IDE Status..."
echo ""

# Get instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=VSCode" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text 2>/dev/null)

if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
    echo "❌ No running VSCode instance found"
    echo ""
    echo "Check if IDE stack is deployed:"
    echo "  aws cloudformation describe-stacks --stack-name powertoolsworkshopide"
    exit 1
fi

echo "✓ Instance ID: $INSTANCE_ID"

# Check instance state
INSTANCE_STATE=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "✓ Instance State: $INSTANCE_STATE"

# Check how long it's been running
LAUNCH_TIME=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].LaunchTime' \
  --output text)

echo "✓ Launch Time: $LAUNCH_TIME"

# Check status checks
STATUS_CHECKS=$(aws ec2 describe-instance-status \
  --instance-ids "$INSTANCE_ID" \
  --query 'InstanceStatuses[0].[SystemStatus.Status,InstanceStatus.Status]' \
  --output text 2>/dev/null || echo "initializing initializing")

echo "✓ Status Checks: $STATUS_CHECKS"

# Get CloudFront URL
IDE_URL=$(aws cloudformation describe-stacks \
  --stack-name powertoolsworkshopide \
  --query 'Stacks[0].Outputs[?OutputKey==`WebIDE`].OutputValue' \
  --output text 2>/dev/null)

echo "✓ IDE URL: $IDE_URL"

# Get password
IDE_PASSWORD=$(aws cloudformation describe-stacks \
  --stack-name powertoolsworkshopide \
  --query 'Stacks[0].Outputs[?OutputKey==`IDEPassword`].OutputValue' \
  --output text 2>/dev/null)

echo "✓ IDE Password: $IDE_PASSWORD"

echo ""
echo "📊 Checking VSCode Server Status..."
echo ""

# Check if we can connect via SSM
echo "Attempting to check VSCode server status via SSM..."
VSCode_STATUS=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["systemctl status code-server@ec2-user --no-pager"]' \
  --query 'Command.CommandId' \
  --output text 2>/dev/null)

if [ -n "$VSCode_STATUS" ] && [ "$VSCode_STATUS" != "None" ]; then
    echo "⏳ Waiting for command to complete..."
    sleep 3
    
    OUTPUT=$(aws ssm get-command-invocation \
      --command-id "$VSCode_STATUS" \
      --instance-id "$INSTANCE_ID" \
      --query 'StandardOutputContent' \
      --output text 2>/dev/null || echo "Command still running...")
    
    echo "$OUTPUT"
else
    echo "⚠️  Cannot connect via SSM. Instance may still be bootstrapping."
fi

echo ""
echo "📋 Recent System Logs (last 50 lines):"
echo ""

# Get console output
aws ec2 get-console-output \
  --instance-id "$INSTANCE_ID" \
  --latest \
  --query 'Output' \
  --output text 2>/dev/null || echo "Console output not available yet"

echo ""
echo "💡 Troubleshooting Tips:"
echo ""
echo "1. If instance just started, wait 10-15 minutes for bootstrap to complete"
echo "2. Check if VSCode server is running:"
echo "   aws ssm start-session --target $INSTANCE_ID"
echo "   sudo systemctl status code-server@ec2-user"
echo ""
echo "3. Restart VSCode server if needed:"
echo "   sudo systemctl restart code-server@ec2-user"
echo ""
echo "4. Check VSCode logs:"
echo "   sudo journalctl -u code-server@ec2-user -f"
echo ""
echo "5. If WebSocket errors persist, try:"
echo "   - Clear browser cache"
echo "   - Try incognito/private mode"
echo "   - Wait a few more minutes"
echo ""
echo "6. Check CloudFront distribution status:"
echo "   aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`PowerTools Workshop IDE`].[Id,Status]' --output table"
