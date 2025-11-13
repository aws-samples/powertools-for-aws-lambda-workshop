/**
 * Module 2: Idempotency Load Generator
 * Based on: test-scenarios/curl-commands/test-payment-idempotency-direct.sh
 * 
 * Sends duplicate DriverAssigned events directly to EventBridge to test payment processor idempotency
 */

import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  generateUUID,
  getCurrentTimestamp,
  sendEventBridgeEvent,
  validateAwsCredentials,
} from './aws-utils.js';

// Custom metrics
const duplicateEventsSent = new Counter('module2_duplicate_events_sent');
const validationExceptions = new Counter('module2_validation_exceptions');
const eventSendTime = new Trend('module2_event_send_time');

// Configuration from environment
const AWS_REGION = __ENV.AWS_REGION || 'eu-west-1';
const EVENT_BUS_NAME = __ENV.EVENT_BUS_NAME || 'powertools-ride-workshop-event-bus';
const TEST_DURATION = __ENV.TEST_DURATION === '0' ? '365d' : (__ENV.TEST_DURATION || '72h');
const EVENTS_PER_MINUTE = parseInt(__ENV.EVENTS_PER_MINUTE || '10');
const NUM_DUPLICATES = parseInt(__ENV.NUM_DUPLICATES || '3'); // Number of duplicate events per ride

// AWS Credentials - must be passed as environment variables
// k6 doesn't read from ~/.aws/credentials automatically
const AWS_ACCESS_KEY_ID = __ENV.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = __ENV.AWS_SECRET_ACCESS_KEY;
const AWS_SESSION_TOKEN = __ENV.AWS_SESSION_TOKEN;

export const options = {
  scenarios: {
    // Scenario 1: Standard idempotency - same price on all duplicates (60%)
    standard_idempotency: {
      executor: 'constant-arrival-rate',
      rate: Math.floor(EVENTS_PER_MINUTE * 0.6), // 60% standard idempotency
      timeUnit: '1m',
      duration: TEST_DURATION,
      preAllocatedVUs: 3,
      maxVUs: 10,
      exec: 'sendDuplicateEvents',
    },
    // Scenario 2: Payload validation - price changes on duplicates (40%)
    payload_validation: {
      executor: 'constant-arrival-rate',
      rate: Math.floor(EVENTS_PER_MINUTE * 0.4), // 40% payload validation
      timeUnit: '1m',
      duration: TEST_DURATION,
      preAllocatedVUs: 2,
      maxVUs: 8,
      exec: 'sendPayloadValidationEvents',
    },
  },
  thresholds: {
    'module2_duplicate_events_sent': ['count>0'],
    'module2_validation_exceptions': ['count>0'],
    'module2_event_send_time': ['p(95)<2000'],
  },
};

// Send event to EventBridge
function sendEventToEventBridge(event, eventBusName) {
  return sendEventBridgeEvent({
    event,
    eventBusName,
    source: 'driver-matching-service',
    detailType: 'DriverAssigned',
    region: AWS_REGION,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN,
  });
}

// Scenario 1: Send duplicate events with same price (standard idempotency)
export function sendDuplicateEvents() {
  const rideId = generateUUID();
  const correlationId = generateUUID(); // Generate ONCE for all duplicates
  const basePrice = 25.50;

  console.log(`\n💳 Standard Idempotency Test - Ride: ${rideId.substring(0, 8)}...`);

  // Send multiple duplicate events with SAME price
  for (let i = 1; i <= NUM_DUPLICATES; i++) {
    const event = {
      eventType: 'DriverAssigned',
      rideId: rideId,
      riderId: 'rider-idempotency-test',
      riderName: 'Test User',
      driverId: 'driver-123',
      driverName: 'Test Driver',
      estimatedPrice: basePrice,
      basePrice: 20.00,
      surgeMultiplier: 1.275,
      pickupLocation: {
        address: '123 Test St, Dublin, Ireland',
        latitude: 53.3498,
        longitude: -6.2603,
      },
      dropoffLocation: {
        address: '456 Destination Ave, Dublin, Ireland',
        latitude: 53.3398,
        longitude: -6.2503,
      },
      estimatedArrivalMinutes: 5,
      distanceKm: 8.5,
      paymentMethod: 'credit-card',
      timestamp: getCurrentTimestamp(),
      correlationId: correlationId, // Use SAME correlationId for all duplicates
    };

    const startTime = Date.now();
    const response = sendEventToEventBridge(event, EVENT_BUS_NAME);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'event sent successfully': (r) => r.status === 200,
    });

    if (success) {
      duplicateEventsSent.add(1);
      if (i === 1) {
        console.log(`  ✅ Event #${i}: $${basePrice} (first - will process)`);
      } else {
        console.log(`  ✅ Event #${i}: $${basePrice} (duplicate - should cache)`);
      }
    } else {
      console.log(`  ❌ Event #${i} failed (status ${response.status}) - ${duration}ms`);
      console.log(`  Response: ${response.body}`);
    }

    eventSendTime.add(duration);
    sleep(0.5);
  }

  sleep(1);
}

// Scenario 2: Send duplicate events with price changes (payload validation)
export function sendPayloadValidationEvents() {
  const rideId = generateUUID();
  const correlationId = generateUUID(); // Generate ONCE for all duplicates
  const basePrice = 25.50;

  console.log(`\n💥 Payload Validation Test - Ride: ${rideId.substring(0, 8)}...`);

  // Send multiple duplicate events with DIFFERENT prices
  for (let i = 1; i <= NUM_DUPLICATES; i++) {
    let price = basePrice;
    let expectValidationError = false;

    // Change price on events 3 and 5 to trigger validation exceptions
    if (i === 3) {
      price = 32.00;
      expectValidationError = true;
    } else if (i === 5 && NUM_DUPLICATES >= 5) {
      price = 28.75;
      expectValidationError = true;
    }

    const event = {
      eventType: 'DriverAssigned',
      rideId: rideId,
      riderId: 'rider-idempotency-test',
      riderName: 'Test User',
      driverId: 'driver-123',
      driverName: 'Test Driver',
      estimatedPrice: price,
      basePrice: 20.00,
      surgeMultiplier: price === basePrice ? 1.275 : (price / 20.00),
      pickupLocation: {
        address: '123 Test St, Dublin, Ireland',
        latitude: 53.3498,
        longitude: -6.2603,
      },
      dropoffLocation: {
        address: '456 Destination Ave, Dublin, Ireland',
        latitude: 53.3398,
        longitude: -6.2503,
      },
      estimatedArrivalMinutes: 5,
      distanceKm: 8.5,
      paymentMethod: 'credit-card',
      timestamp: getCurrentTimestamp(),
      correlationId: correlationId, // Use SAME correlationId for all duplicates
    };

    const startTime = Date.now();
    const response = sendEventToEventBridge(event, EVENT_BUS_NAME);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'event sent successfully': (r) => r.status === 200,
    });

    if (success) {
      duplicateEventsSent.add(1);
      if (expectValidationError) {
        validationExceptions.add(1);
        console.log(`  💥 Event #${i}: $${price} (MISMATCH - should throw exception)`);
      } else if (i === 1) {
        console.log(`  ✅ Event #${i}: $${price} (first - will process)`);
      } else {
        console.log(`  ✅ Event #${i}: $${price} (duplicate - should cache)`);
      }
    } else {
      console.log(`  ❌ Event #${i} failed (status ${response.status}) - ${duration}ms`);
      console.log(`  Response: ${response.body}`);
    }

    eventSendTime.add(duration);
    sleep(0.5);
  }

  sleep(1);
}

export function setup() {
  console.log('💳 Module 2: Idempotency Testing');
  console.log('================================================');
  console.log('Testing payment processor idempotency and payload validation');
  console.log(`Event Bus: ${EVENT_BUS_NAME}`);
  console.log(`AWS Region: ${AWS_REGION}`);
  console.log(`Test Duration: ${TEST_DURATION}`);
  console.log(`Target Rate: ${EVENTS_PER_MINUTE} events/minute`);
  console.log(`Duplicates per ride: ${NUM_DUPLICATES}`);
  console.log('');

  // Validate AWS credentials
  if (!validateAwsCredentials(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)) {
    throw new Error('AWS credentials not configured');
  }

  console.log('Scenarios:');
  console.log('  1. Standard Idempotency (60%) - Same price on all duplicates');
  console.log('     → First event processes, duplicates return cached response');
  console.log('  2. Payload Validation (40%) - Price changes on duplicates');
  console.log('     → Price mismatches trigger IdempotencyValidationException');
  console.log('');
}

export function teardown() {
  console.log('');
  console.log('✅ Module 2 load generation complete');
}
