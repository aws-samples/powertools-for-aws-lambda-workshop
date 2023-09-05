using System.Drawing;

namespace PowertoolsWorkshop;
public static class Constants
{
    public const string TransformedImagePrefix = "transformed/image/jpg";
    public const string TransformedImageExtension = ".jpeg";
}

public static class TransformSize
{
    public static readonly Size Small = new Size(720, 480);
    public static readonly Size Medium = new Size(1280, 720);
    public static readonly Size Large = new Size(1920, 1080);
}

public static class FileStatus
{
    public static readonly string Queued= "queued";
    public static readonly string Working= "in-progress";
    public static readonly string Completed = "completed";
    public static readonly string Failed = "failed";
}

public static class Mutations
{ 
    public static readonly string GeneratePresignedUploadUrl = @"
        mutation GeneratePresignedUploadUrl($input: PresignedUploadUrlInput)  {
            generatePresignedUploadUrl(input: $input) {
                id
                url
            }
        }
    ";
    
    public static readonly string UpdateFileStatus = @"
        mutation UpdateFileStatus($input: FileStatusUpdateInput) {
            updateFileStatus(input: $input) {
                id
                status
                transformedFileKey
            }
        }
    ";

}