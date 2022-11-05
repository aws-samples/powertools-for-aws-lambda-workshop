import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import {
  TableRow,
  TableCell,
  Loader,
  Badge,
  BadgeVariations,
} from "@aws-amplify/ui-react";
import { getStatusColor, upload } from "./Upload.helpers";

type FileUploadProps = {
  children?: React.ReactNode;
  id: string;
  url?: string;
  status: string;
  file: File;
  setFileStatus: (id: string, status: string) => void;
};

const FileUpload: React.FC<FileUploadProps> = memo(
  ({ id, file, status, url, setFileStatus }) => {
    const [progress, setProgress] = useState(0);
    const hasStartedRef = useRef(false);

    if (!url) return null;

    useEffect(() => {
      const uploadFile = async () => {
        setFileStatus(id, "uploading");
        await upload(url, file, onUploadProgress);
      };

      if (!file || !url || hasStartedRef.current) return;
      hasStartedRef.current = true;
      uploadFile();
    }, [url]);

    const onUploadProgress = useCallback((progressEvent: any): void => {
      var percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      setProgress(percentCompleted);
      if (percentCompleted === 100) setFileStatus(id, "uploaded");
    }, []);

    return (
      <TableRow>
        <TableCell width={"50%"}>{file.name}</TableCell>
        <TableCell width={"50%"}>
          {status === "uploading" && progress !== 100 ? (
            <>
              {status} {progress}% <Loader />
            </>
          ) : (
            <Badge variation={getStatusColor(status) as BadgeVariations}>
              {status}
            </Badge>
          )}
        </TableCell>
      </TableRow>
    );
  }
);

export default FileUpload;
