import { options as module1Options } from './module1-observability.js';
import { options as module2Options } from './module2-idempotency.js';
import { options as module3Options } from './module3-batch-processing.js';

// Import all scenario functions (but not setup/teardown to avoid conflicts)
export {
  generateErrorRequests,
  generateSuccessRequests,
  generateSomeCompanyPayRequests,
} from './module1-observability.js';

export {
  sendDuplicateEvents,
  sendPayloadValidationEvents,
} from './module2-idempotency.js';

export {
  createBatchWithFailures,
} from './module3-batch-processing.js';

// Combine all scenarios (using Object.assign for k6 0.48.0 compatibility)
export const options = {
  scenarios: Object.assign(
    {},
    module1Options.scenarios,
    module2Options.scenarios,
    module3Options.scenarios
  ),
  thresholds: Object.assign(
    {},
    module1Options.thresholds,
    module2Options.thresholds,
    module3Options.thresholds
  ),
};

// Combined setup function
export function setup() {
  console.log('🚀 Running All Modules');
  console.log('================================================');
  console.log('Module 1: Observability & Structured Logging ✅');
  console.log('Module 2: Idempotency ✅');
  console.log('Module 3: Batch Processing ✅');
  console.log('================================================');
}

// Combined teardown function
export function teardown() {
  console.log('');
  console.log('✅ Test completed');
}
