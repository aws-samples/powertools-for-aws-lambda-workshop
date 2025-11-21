FROM --platform=linux/amd64 ghcr.io/grafana/k6:1.4.1@sha256:47fdd183fd68112596590e62deae34da814efe2d21e026569044025c45af9fad

# Copy the K6 scripts
COPY /src/*.js /scripts/

# Set working directory
WORKDIR /scripts

# Environment variables - will be overridden by ECS task
ENV TEST_DURATION=72h
ENV RIDES_PER_MINUTE=120
ENV EVENTS_PER_MINUTE=10
ENV BATCHES_PER_MINUTE=5
ENV MODULE=all-modules

# Use shell form to fetch credentials and run k6
ENTRYPOINT ["/bin/sh", "-c", "\
if [ -n \"$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI\" ]; then \
  CREDS=$(wget -qO- http://169.254.170.2$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI); \
  export AWS_ACCESS_KEY_ID=$(echo $CREDS | grep -o '\"AccessKeyId\":\"[^\"]*' | cut -d'\"' -f4); \
  export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | grep -o '\"SecretAccessKey\":\"[^\"]*' | cut -d'\"' -f4); \
  export AWS_SESSION_TOKEN=$(echo $CREDS | grep -o '\"Token\":\"[^\"]*' | cut -d'\"' -f4); \
fi; \
exec k6 run \
  -e TEST_DURATION=$TEST_DURATION \
  -e RIDES_PER_MINUTE=$RIDES_PER_MINUTE \
  -e EVENTS_PER_MINUTE=$EVENTS_PER_MINUTE \
  -e BATCHES_PER_MINUTE=$BATCHES_PER_MINUTE \
  -e API_GATEWAY_URL=$API_GATEWAY_URL \
  -e EVENT_BUS_NAME=$EVENT_BUS_NAME \
  -e PAYMENTS_TABLE_NAME=$PAYMENTS_TABLE_NAME \
  -e AWS_REGION=$AWS_REGION \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN \
  /scripts/$MODULE.js"]
