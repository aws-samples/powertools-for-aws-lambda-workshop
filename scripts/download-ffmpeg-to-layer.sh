# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

#!/bin/bash

set -e

curl https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz --output ffmpeg-release-amd64-static.tar.xz
tar xvf ffmpeg-release-amd64-static.tar.xz
cp ffmpeg-*-amd64-static/ffmpeg layers/ffmpeg/bin/
cp ffmpeg-*-amd64-static/ffprobe layers/ffmpeg/bin/
rm -rf ffmpeg-release-amd64-static.tar.xz
rm -rf ffmpeg-*-amd64-static