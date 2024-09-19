import {
  Badge,
  type BadgeVariations,
  Button,
  Loader,
  TableCell,
  TableRow,
} from '@aws-amplify/ui-react';
import type React from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { getDownloadUrl } from '../../helpers/API';
import { getStatusColor, upload } from './Upload.helpers';

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
    const [isDownloadLoading, setDownloadLoading] = useState(false);
    const hasStartedRef = useRef(false);

    if (!url) return null;

    useEffect(() => {
      const uploadFile = async (): Promise<void> => {
        setFileStatus(id, 'uploading');
        await upload(url, file, onUploadProgress);
      };

      if (!file || !url || hasStartedRef.current) return;
      hasStartedRef.current = true;
      uploadFile();
    }, [url]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onUploadProgress = useCallback((progressEvent: any): void => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      setProgress(percentCompleted);
      if (percentCompleted === 100) setFileStatus(id, 'uploaded');
    }, []);

    const handleDownload = useCallback(async () => {
      setDownloadLoading(true);
      try {
        const downloadUrl = await getDownloadUrl(id);
        console.log(downloadUrl);
        window.open(downloadUrl);
      } finally {
        setDownloadLoading(false);
      }
    }, [id]);

    return (
      <TableRow>
        <TableCell width={'40%'}>{file.name}</TableCell>
        <TableCell width={'40%'}>
          {status === 'uploading' && progress !== 100 ? (
            <>
              {status} {progress}% <Loader />
            </>
          ) : (
            <Badge variation={getStatusColor(status) as BadgeVariations}>
              {status}
            </Badge>
          )}
        </TableCell>
        <TableCell width={'20%'}>
          {status === 'completed' ? (
            <Button
              variation="primary"
              size="small"
              onClick={handleDownload}
              loadingText="loading"
              isLoading={isDownloadLoading}
            >
              Download
            </Button>
          ) : null}
        </TableCell>
      </TableRow>
    );
  }
);

export default FileUpload;
