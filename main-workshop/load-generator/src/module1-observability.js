/**
 * Module 1: Observability & Structured Logging Load Generator
 * Based on: test-scenarios/validation/validate-chapter-2.sh
 * 
 * Simulates customer issues with missing headers and validates structured logging
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { generateUUID } from './aws-utils.js';

// Helper: cryptographically secure [0,1)
function secureRandom() {
  // Uint32 can store values 0 - 2^32-1, so scale appropriately
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 4294967296; // 2^32
}

// Custom metrics
const errorRequests = new Counter('module1_error_requests');
const successRequests = new Counter('module1_success_requests');
const somecompanyPayRequests = new Counter('module1_somecompany_pay_requests');
const responseTime = new Trend('module1_response_time');
const somecompanyPayLatency = new Trend('module1_somecompany_pay_latency');

// Configuration from environment
const API_GATEWAY_URL = (__ENV.API_GATEWAY_URL || 'https://your-api-id.execute-api.region.amazonaws.com/prod').replace(/\/$/, '');
const TEST_DURATION = __ENV.TEST_DURATION === '0' ? '365d' : (__ENV.TEST_DURATION || '72h'); // Default 72 hours, 0 meansays)
const RIDES_PER_MINUTE = parseInt(__ENV.RIDES_PER_MINUTE || '120');

export const options = {
  scenarios: {
    // Scenario 1: Customer issue - wrong header causing errors
    customer_errors: {
      executor: 'constant-arrival-rate',
      rate: Math.floor(RIDES_PER_MINUTE * 0.2), // 20% error rate
      timeUnit: '1m',
      duration: TEST_DURATION,
      preAllocatedVUs: 5,
      maxVUs: 20,
      exec: 'generateErrorRequests',
    },
    // Scenario 2: Successful rides with correct headers
    successful_rides: {
      executor: 'constant-arrival-rate',
      rate: Math.floor(RIDES_PER_MINUTE * 0.6), // 60% success rate
      timeUnit: '1m',
      duration: TEST_DURATION,
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'generateSuccessRequests',
    },
    // Scenario 3: SomeCompany Pay latency (performance monitoring)
    somecompany_pay_latency: {
      executor: 'constant-arrival-rate',
      rate: Math.floor(RIDES_PER_MINUTE * 0.2), // 20% SomeCompany Pay
      timeUnit: '1m',
      duration: TEST_DURATION,
      preAllocatedVUs: 5,
      maxVUs: 15,
      exec: 'generateSomeCompanyPayRequests',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<10000'], // Increased for SomeCompany Pay latency
    'module1_error_requests': ['count>0'], // Expect errors
    'module1_success_requests': ['count>0'], // Expect successes
    'module1_somecompany_pay_requests': ['count>0'], // Expect SomeCompany Pay requests
  },
};



// Generate ride data
function generateRideData(riderId) {
  return {
    riderId: riderId,
    riderName: `Test Customer ${Math.floor(secureRandom() * 1000)}`,
    pickupLocation: {
      address: '123 Customer St, San Francisco, CA',
      latitude: 37.7749 + (secureRandom() - 0.5) * 0.01,
      longitude: -122.4194 + (secureRandom() - 0.5) * 0.01,
    },
    destinationLocation: {
      address: '456 Destination Ave, San Francisco, CA',
      latitude: 37.7849 + (secureRandom() - 0.5) * 0.01,
      longitude: -122.4094 + (secureRandom() - 0.5) * 0.01,
    },
    paymentMethod: 'credit-card',
  };
}

// Scenario 1: Generate error requests (wrong header)
export function generateErrorRequests() {
  const correlationId = generateUUID();
  const rideData = generateRideData(`frustrated-customer-${Math.floor(secureRandom() * 1000)}`);

  const headers = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    'x-device': 'android', // WRONG HEADER - should be 'x-device-id'
  };

  const startTime = Date.now();
  const response = http.post(
    `${API_GATEWAY_URL}/rides`,
    JSON.stringify(rideData),
    { headers }
  );
  const duration = Date.now() - startTime;

  const success = check(response, {
    'error request returns 500': (r) => r.status === 500,
  });

  if (success) {
    errorRequests.add(1);
    console.log(`❌ Error request (status ${response.status}) - ${duration}ms [${correlationId}]`);
  } else {
    console.log(`⚠️  Error request got unexpected status ${response.status} - ${duration}ms [${correlationId}]`);
  }

  responseTime.add(response.timings.duration);
  sleep(1);
}

// Scenario 2: Generate successful requests (correct header)
export function generateSuccessRequests() {
  const correlationId = generateUUID();
  const deviceTypes = ['iphone', 'android', 'web'];
  const deviceId = deviceTypes[Math.floor(secureRandom() * deviceTypes.length)];

  // Payment method distribution: 80% credit-card, 20% cash
  const paymentMethods = ['credit-card', 'credit-card', 'credit-card', 'credit-card', 'credit-card', 'credit-card', 'credit-card', 'credit-card', 'cash', 'cash'];
  const paymentMethod = paymentMethods[Math.floor(secureRandom() * paymentMethods.length)];

  const rideData = generateRideData(`happy-customer-${Math.floor(secureRandom() * 1000)}`);
  rideData.paymentMethod = paymentMethod;

  const headers = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    'x-device-id': deviceId, // CORRECT HEADER
  };

  const startTime = Date.now();
  const response = http.post(
    `${API_GATEWAY_URL}/rides`,
    JSON.stringify(rideData),
    { headers }
  );
  const duration = Date.now() - startTime;

  const success = check(response, {
    'successful request returns 201': (r) => r.status === 201,
    'response has rideId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.rideId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (success) {
    successRequests.add(1);
    console.log(`✅ Success ride created (device: ${deviceId}, payment: ${rideData.paymentMethod}) - ${duration}ms [${correlationId}]`);
  } else {
    console.log(`⚠️  Success ride failed (status ${response.status}, payment: ${rideData.paymentMethod}) - ${duration}ms [${correlationId}]`);
  }

  responseTime.add(response.timings.duration);
  sleep(1);
}

// Scenario 3: Generate SomeCompany Pay requests (performance monitoring)
export function generateSomeCompanyPayRequests() {
  const correlationId = generateUUID();
  const rideData = {
    riderId: `trace-somecompany-rider-${Math.floor(secureRandom() * 1000)}`,
    riderName: 'SomeCompany Pay Trace User',
    pickupLocation: {
      address: '200 SomeCompany St, San Francisco, CA',
      latitude: 37.7749 + (secureRandom() - 0.5) * 0.01,
      longitude: -122.4194 + (secureRandom() - 0.5) * 0.01,
    },
    destinationLocation: {
      address: '600 SomeCompany Ave, San Francisco, CA',
      latitude: 37.7849 + (secureRandom() - 0.5) * 0.01,
      longitude: -122.4094 + (secureRandom() - 0.5) * 0.01,
    },
    paymentMethod: 'somecompany-pay', // This triggers 5-second payment processing delay
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    'x-device-id': 'iphone', // SomeCompany Pay typically from iPhone
  };

  const startTime = Date.now();
  const response = http.post(
    `${API_GATEWAY_URL}/rides`,
    JSON.stringify(rideData),
    { headers }
  );
  const duration = Date.now() - startTime;

  const success = check(response, {
    'somecompany pay request returns 201': (r) => r.status === 201,
    'response has rideId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.rideId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (success) {
    somecompanyPayRequests.add(1);
    console.log(`⏱️  SomeCompany Pay completed - ${duration}ms [${correlationId}]`);
  } else {
    console.log(`⚠️  SomeCompany Pay failed (status ${response.status}) - ${duration}ms [${correlationId}]`);
  }

  responseTime.add(response.timings.duration);
  somecompanyPayLatency.add(response.timings.duration);
  sleep(1);
}

export function setup() {
  console.log('🔍 Module 1: Observability & Structured Logging');
  console.log('================================================');
  console.log('Testing structured logging, error handling, and performance monitoring');
  console.log(`API Gateway URL: ${API_GATEWAY_URL}`);
  console.log(`Test Duration: ${TEST_DURATION}`);
  console.log(`Target Rate: ${RIDES_PER_MINUTE} rides/minute`);
  console.log('');
  console.log('Scenarios:');
  console.log('  1. Customer Errors (20%) - Wrong header causing 500 errors');
  console.log('  2. Successful Rides (60%) - Normal ride requests');
  console.log('  3. SomeCompany Pay Latency (20%) - Performance monitoring with 5s delay');
  console.log('');
}

export function teardown(data) {
  console.log('');
  console.log('✅ Module 1 load generation complete');
  console.log('');
  console.log('🔍 Verification Steps:');
  console.log('');
  console.log('1. Check CloudWatch Logs for structured logging:');
  console.log('   - JSON-formatted logs with correlation IDs');
  console.log('   - Business context (RideId, PaymentMethod)');
  console.log('   - Error logs with proper context');
  console.log('');
  console.log('2. Check X-Ray Service Map for SomeCompany Pay latency:');
  console.log('   - payment-processor service showing increased latency');
  console.log('   - SomeCompany Pay verification segment taking ~5 seconds');
  console.log('');
  console.log('3. Check CloudWatch Metrics:');
  console.log('   - Error rates from wrong header requests');
  console.log('   - Success rates from normal requests');
  console.log('   - P95/P99 latency for SomeCompany Pay requests');
}
