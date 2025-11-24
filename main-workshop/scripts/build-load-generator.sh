#!/bin/bash
set -e

echo "Building load generator Docker image..."
docker build --platform linux/amd64 \
  -t powertools-workshop-load-generator:latest \
  -f load-generator/Dockerfile \
  load-generator

echo "Saving image as tarball..."
docker save powertools-workshop-load-generator:latest \
  -o load-generator/load-generator.tar

echo "✅ Load generator image built and saved to load-generator/load-generator.tar"
echo "Size: $(du -h load-generator/load-generator.tar | cut -f1)"
