import axios from 'axios';

import { getPresignedUrl } from '../../helpers/API';

export type FileWithUrl = {
  id: string;
  url?: string;
  status: string;
  file: File;
};

export type FileWithUrlMap = Map<string, FileWithUrl>;

export const generateUploadUrls = async (
  acceptedFiles: File[]
): Promise<FileWithUrlMap> => {
  try {
    const presignedUrlData = await Promise.all(
      acceptedFiles.map((file) => getPresignedUrl(file))
    );
    const newFileUploadData: FileWithUrlMap = new Map();
    presignedUrlData.forEach((presignedUrl, idx) => {
      if (presignedUrl) {
        newFileUploadData.set(presignedUrl.id, {
          id: presignedUrl.id,
          url: presignedUrl.url,
          file: acceptedFiles[idx],
          status: 'ready',
        });
      } else {
        const localUUID = self.crypto.randomUUID();
        newFileUploadData.set(localUUID, {
          id: localUUID,
          file: acceptedFiles[idx],
          status: 'failed',
        });
      }
    });

    return newFileUploadData;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getFileFromInput = (file: File): Promise<unknown> => {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onerror = reject;
    fileReader.onload = () => {
      resolve(fileReader.result);
    };
    fileReader.readAsArrayBuffer(file); // here the file can be read in different way Text, DataUrl, ArrayBuffer
  });
};

export const upload = async (
  uploadUrl: string,
  file: File,
  onUploadProgress: (e: unknown) => void
): Promise<void> => {
  const blob = await getFileFromInput(file);
  try {
    console.debug('about to upload', file.name);
    axios.put(uploadUrl, blob, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress,
    });
  } catch (err) {
    console.error(err);
  } finally {
    console.debug('Upload completed');
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'queued':
      return 'warning';
    case 'in-progress':
      return 'info';
    case 'failed':
      return 'error';
    default:
      return '';
  }
};
