// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using SkiaSharp;

namespace PowertoolsWorkshop.Module1.Services;

public interface IImageManipulationService
{
    Task<Stream> ResizeAsync(Stream stream, Size size);
}

public class ImageManipulationService : IImageManipulationService
{
    public async Task<Stream> ResizeAsync(Stream stream, Size maxSize)
    {
        using var tmp = new MemoryStream();
        await stream.CopyToAsync(tmp);
        var data = Resize(tmp.ToArray(), maxSize.Width, maxSize.Height);
        return new MemoryStream(data);
    }
    
    private static byte[] Resize(byte[] fileContents, int maxWidth, int maxHeight)
    {
        using var ms = new MemoryStream(fileContents);
        using var sourceBitmap = SKBitmap.Decode(ms);

        var height = Math.Min(maxHeight, sourceBitmap.Height);
        var width = Math.Min(maxWidth, sourceBitmap.Width);
        
        using var scaledBitmap = sourceBitmap.Resize(new SKImageInfo(width, height), SKFilterQuality.Medium);
        using var scaledImage = SKImage.FromBitmap(scaledBitmap);
        using var data = scaledImage.Encode();

        return data.ToArray();
    }
}