import axios from 'axios';

import { getPresignedUrl } from '../../helpers/API';

export const generateUUID = (): string => {
  let d = new Date().getTime(); //Timestamp
  let d2 =
    (typeof performance !== 'undefined' &&
      performance.now &&
      performance.now() * 1000) ||
    0; //Time in microseconds since page-load or 0 if unsupported

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = ((d + r) % 16) | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = ((d2 + r) % 16) | 0;
      d2 = Math.floor(d2 / 16);
    }

    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

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
        const localUUID = generateUUID();
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
