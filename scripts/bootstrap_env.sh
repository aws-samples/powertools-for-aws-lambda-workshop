# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

#!/bin/bash

set -e

# Install workspace dependencies (includes: frontend, infra, functions, scripts)
npm ci

# Install sharp nodejs bindings + precompiled version into layer folder
cd layers/sharp/nodejs
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --arch=x64 --platform=linux --libc=glibc sharp@0.31.1
cd ../../../