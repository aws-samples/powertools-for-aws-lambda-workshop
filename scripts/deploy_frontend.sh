# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

#!/bin/bash

set -e

npm run utils:createConfig
npm run frontend:build
npm run deploy:headless -w frontend