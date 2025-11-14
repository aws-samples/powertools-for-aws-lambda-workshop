# Dynamic Pricing Service - Real-time surge pricing based on demand
#
# This service:
# - Listens to RideCreated events from EventBridge
# - Calculates ride pricing based on distance, surge multipliers, and business rules
# - Retrieves rush hour multipliers from AWS Secrets Manager
# - Publishes PriceCalculated events for driver matching
# - Stores pricing calculations in DynamoDB for analytics
