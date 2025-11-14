import * as lambda from 'aws-cdk-lib/aws-lambda';

// Service Configuration for Multi-Language Support
export interface ServiceLanguageConfig {
  language: 'dotnet' | 'java' | 'python' | 'typescript';
  runtime: lambda.Runtime;
  handler: string;
  assetPath: string;
  buildCommand?: string;
}

export interface ServiceConfigs {
  rideService: ServiceLanguageConfig;
  driverMatchingService: ServiceLanguageConfig;
  dynamicPricingService: ServiceLanguageConfig;
  paymentProcessor: ServiceLanguageConfig;
  paymentStreamProcessor: ServiceLanguageConfig;
  rideCompletionService: ServiceLanguageConfig;
}

// Language-specific configurations
export const LANGUAGE_CONFIGS = {
  dotnet: {
    runtime: lambda.Runtime.DOTNET_8,
    assetPath: (serviceName: string) => `../services/dotnet/${serviceName}/publish`,
    handler: (serviceName: string, className: string) => `${className}::${className}.Functions::FunctionHandler`,
    buildCommand: 'dotnet publish -c Release -r linux-x64 --self-contained false -o publish'
  },
  java: {
    runtime: lambda.Runtime.JAVA_21,
    assetPath: (serviceName: string) => `../services/java/${serviceName}/target/${serviceName}-1.0.0.jar`,
    handler: (serviceName: string, className: string) => `com.powertoolsride.${serviceName}.Handler::handleRequest`,
    buildCommand: 'mvn clean package'
  },
  python: {
    runtime: lambda.Runtime.PYTHON_3_12,
    assetPath: (serviceName: string) => `../services/python/${serviceName}`,
    handler: (serviceName: string) => `lambda_function.lambda_handler`,
  },
  typescript: {
    runtime: lambda.Runtime.NODEJS_22_X,
    assetPath: (serviceName: string) => `../services/typescript/${serviceName}/dist`,
    handler: (serviceName: string) => `index.handler`,
    buildCommand: 'npm run build'
  }
};

// Service-specific handler mappings
export const SERVICE_HANDLERS = {
  dotnet: {
    rideService: 'RideService::Function::FunctionHandler',
    driverMatchingService: 'DriverMatchingService::Function::FunctionHandler',
    dynamicPricingService: 'DynamicPricingService::Function::FunctionHandler',
    paymentProcessor: 'PaymentProcessor::Function::FunctionHandler',
    paymentStreamProcessor: 'PaymentStreamProcessor::Function::HandleStreamRecord',
    rideCompletionService: 'RideCompletionService::Function::HandlePaymentCompletedEvent'
  },
  java: {
    rideService: 'com.powertoolsride.rideservice.Handler::handleRequest',
    driverMatchingService: 'com.powertoolsride.drivermatchingservice.Handler::handleRequest',
    dynamicPricingService: 'com.powertoolsride.dynamicpricingservice.Handler::handleRequest',
    paymentProcessor: 'com.powertoolsride.paymentprocessor.Handler::handleRequest',
    paymentStreamProcessor: 'com.powertoolsride.paymentstreamprocessor.Handler::handleRequest',
    rideCompletionService: 'com.powertoolsride.ridecompletionservice.Handler::handleRequest'
  },
  python: {
    rideService: 'lambda_function.lambda_handler',
    driverMatchingService: 'lambda_function.lambda_handler',
    dynamicPricingService: 'lambda_function.lambda_handler',
    paymentProcessor: 'lambda_function.lambda_handler',
    paymentStreamProcessor: 'lambda_function.lambda_handler',
    rideCompletionService: 'lambda_function.lambda_handler'
  },
  typescript: {
    rideService: 'index.handler',
    driverMatchingService: 'index.handler',
    dynamicPricingService: 'index.handler',
    paymentProcessor: 'index.handler',
    paymentStreamProcessor: 'index.handler',
    rideCompletionService: 'index.handler'
  }
};

// Runtime mappings (deprecated - use LANGUAGE_CONFIGS.runtime directly)
export const RUNTIME_MAPPINGS = {
  dotnet: lambda.Runtime.DOTNET_8,
  java: lambda.Runtime.JAVA_21,
  python: lambda.Runtime.PYTHON_3_12,
  typescript: lambda.Runtime.NODEJS_22_X
};

export function getServiceConfig(language: string): ServiceConfigs {
  const lang = language as keyof typeof LANGUAGE_CONFIGS;
  const config = LANGUAGE_CONFIGS[lang];
  const handlers = SERVICE_HANDLERS[lang];

  if (!config || !handlers) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return {
    rideService: {
      language: lang,
      runtime: config.runtime,
      handler: handlers.rideService,
      assetPath: config.assetPath('ride-service')
    },
    driverMatchingService: {
      language: lang,
      runtime: config.runtime,
      handler: handlers.driverMatchingService,
      assetPath: config.assetPath('driver-matching-service')
    },
    dynamicPricingService: {
      language: lang,
      runtime: config.runtime,
      handler: handlers.dynamicPricingService,
      assetPath: config.assetPath('dynamic-pricing-service')
    },
    paymentProcessor: {
      language: lang,
      runtime: config.runtime,
      handler: handlers.paymentProcessor,
      assetPath: config.assetPath('payment-processor')
    },
    paymentStreamProcessor: {
      language: lang,
      runtime: config.runtime,
      handler: handlers.paymentStreamProcessor,
      assetPath: config.assetPath('payment-stream-processor')
    },
    rideCompletionService: {
      language: lang,
      runtime: config.runtime,
      handler: handlers.rideCompletionService,
      assetPath: config.assetPath('ride-completion-service')
    }
  };
}

// Auto-detect available language based on directory structure
export function detectAvailableLanguage(): string {
  const fs = require('fs');
  const path = require('path');

  const servicesDir = path.join(__dirname, '../../../services');

  // Check for language directories in order of preference
  const languages = ['dotnet', 'java', 'python', 'typescript'];

  for (const lang of languages) {
    const langDir = path.join(servicesDir, lang);
    if (fs.existsSync(langDir)) {
      return lang;
    }
  }

  throw new Error('No supported language services found. Please ensure services exist in services/{language}/ directories.');
}
