/**
 * Module 3: Batch Processing Load Generator
 * Based on: test-scenarios/curl-commands/test-batch-processing-failures.sh
 * 
 * Creates payment records in DynamoDB and triggers status updates to demonstrate
 * batch processing failures and cascade effects
 */

import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  generateUUID,
  getCurrentTimestamp,
  putDynamoDBItem,
  updateDynamoDBItem,
  validateAwsCredentials,
} from './aws-utils.js';

// Custom metrics
const batchesCreated = new Counter('module3_batches_created');
const recordsCreated = new Counter('module3_records_created');
const recordsUpdated = new Counter('module3_records_updated');
const failureRecords = new Counter('module3_failure_records');
const batchCreateTime = new Trend('module3_batch_create_time');

// Configuration from environment
const AWS_REGION = __ENV.AWS_REGION || 'eu-west-1';
const PAYMENTS_TABLE_NAME = __ENV.PAYMENTS_TABLE_NAME || 'powertools-ride-workshop-Payments';
const TEST_DURATION = __ENV.TEST_DURATION === '0' ? '365d' : (__ENV.TEST_DURATION || '72h');
const BATCHES_PER_MINUTE = parseInt(__ENV.BATCHES_PER_MINUTE || '6');
const RECORDS_PER_BATCH = parseInt(__ENV.RECORDS_PER_BATCH || '1');

// AWS Credentials
const AWS_ACCESS_KEY_ID = __ENV.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = __ENV.AWS_SECRET_ACCESS_KEY;
const AWS_SESSION_TOKEN = __ENV.AWS_SESSION_TOKEN;

export const options = {
  scenarios: {
    // Scenario: Create batches with failures
    create_batches: {
      executor: 'constant-arrival-rate',
      rate: BATCHES_PER_MINUTE,
      timeUnit: '1m',
      duration: TEST_DURATION,
      preAllocatedVUs: 3,
      maxVUs: 10,
      exec: 'createBatchWithFailures',
    },
  },
  thresholds: {
    'module3_batches_created': ['count>0'],
    'module3_records_created': ['count>0'],
    'module3_batch_create_time': ['p(95)<30000'],
  },
};

// Create a POISON payment record in DynamoDB
function createPoisonPaymentRecord(paymentId, rideId, batchId) {
  // POISON record - always fails when processed by Lambda
  const item = {
    paymentId: { S: `POISON-${paymentId}` },
    rideId: { S: rideId },
    riderId: { S: 'rider-batch-test' },
    driverId: { S: 'driver-batch-test' },
    amount: { N: '25.50' },
    paymentMethod: { S: 'credit-card' },
    status: { S: 'pending' },
    transactionId: { S: `txn-${generateUUID()}` },
    correlationId: { S: batchId },
    createdAt: { S: getCurrentTimestamp() },
  };

  return putDynamoDBItem({
    tableName: PAYMENTS_TABLE_NAME,
    item: item,
    region: AWS_REGION,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN,
  });
}

// Update payment status (triggers DynamoDB Stream)
function updatePaymentStatus(paymentId) {
  return updateDynamoDBItem({
    tableName: PAYMENTS_TABLE_NAME,
    key: {
      paymentId: { S: paymentId },
    },
    updateExpression: 'SET #status = :completed',
    expressionAttributeNames: {
      '#status': 'status',
    },
    expressionAttributeValues: {
      ':completed': { S: 'completed' },
    },
    region: AWS_REGION,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN,
  });
}

// Main scenario: Create batch with POISON records only
export function createBatchWithFailures() {
  const batchId = generateUUID();
  const startTime = Date.now();

  console.log(`\n� CCreating POISON Batch: ${batchId}`);
  console.log(`   Records: ${RECORDS_PER_BATCH} (ALL POISON)`);

  // Step 1: Create all POISON payment records
  const paymentIds = [];
  for (let i = 1; i <= RECORDS_PER_BATCH; i++) {
    const paymentId = generateUUID();
    const rideId = generateUUID();
    const poisonPaymentId = `POISON-${paymentId}`;

    paymentIds.push(poisonPaymentId);

    const response = createPoisonPaymentRecord(paymentId, rideId, batchId);

    const success = check(response, {
      'poison record created': (r) => r.status === 200,
    });

    if (success) {
      recordsCreated.add(1);
      failureRecords.add(1);
      console.log(`  💀 Record #${i}: POISON-${paymentId.substring(0, 8)}...`);
    } else {
      console.log(`  ❌ Record #${i}: Failed to create (status ${response.status})`);
      console.log(`  Response: ${response.body}`);
    }

    sleep(0.1); // Small delay between creates
  }

  // Step 2: Wait before triggering updates
  console.log('  ⏳ Waiting 2s before triggering updates...');
  sleep(2);

  // Step 3: Update all payment statuses (triggers DynamoDB Streams)
  console.log('  🔄 Triggering status updates (will cause Lambda failures)...');
  for (let i = 0; i < paymentIds.length; i++) {
    const response = updatePaymentStatus(paymentIds[i]);

    const success = check(response, {
      'payment status updated': (r) => r.status === 200,
    });

    if (success) {
      recordsUpdated.add(1);
      console.log(`  ✓ Update #${i + 1}: Triggered (Lambda will fail processing this)`);
    } else {
      console.log(`  ❌ Update #${i + 1}: Failed (status ${response.status})`);
    }

    sleep(0.02); // Small delay between updates
  }

  const duration = Date.now() - startTime;
  batchCreateTime.add(duration);
  batchesCreated.add(1);

  console.log(`✅ Batch ${batchId} completed in ${duration}ms`);
  console.log(`   💀 ${RECORDS_PER_BATCH} POISON records sent - Lambda will fail on ALL`);

  sleep(1); // Wait before next batch
}

export function setup() {
  console.log('💀 Module 3: Batch Processing - POISON Records Only');
  console.log('================================================');
  console.log('Sending ONLY poison records to demonstrate batch failures');
  console.log(`DynamoDB Table: ${PAYMENTS_TABLE_NAME}`);
  console.log(`AWS Region: ${AWS_REGION}`);
  console.log(`Test Duration: ${TEST_DURATION}`);
  console.log(`Batches per minute: ${BATCHES_PER_MINUTE}`);
  console.log(`Records per batch: ${RECORDS_PER_BATCH} (ALL POISON)`);
  console.log('');

  // Validate AWS credentials
  if (!validateAwsCredentials(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)) {
    throw new Error('AWS credentials not configured');
  }

  console.log('💀 What this does:');
  console.log('  - Creates batches with ONLY poison records');
  console.log('  - Every record has paymentId starting with "POISON-"');
  console.log('');
}

export function teardown() {
  console.log('');
  console.log('✅ Module 3 load generation complete');
  console.log('');
}
