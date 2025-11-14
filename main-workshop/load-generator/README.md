# Load Generator

This folder contains the infrastructure code for deploying a load generator to test the performance of the deployed services.

## ECR Repository

By default the load generator uses a private ECR repository to store the Docker image used for load generation. You can build and push an image to your own repository and pass the `LoadGeneratorImageUri` parameter when deploying the load generator stack to use your own image.
