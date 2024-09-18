import { Flex } from '@aws-amplify/ui-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';

import { subscribeToFileUpdates } from '../../helpers/API';
import DropZone from './DropZone';
import { type FileWithUrlMap, generateUploadUrls } from './Upload.helpers';
import UploadingTable from './UploadingTable';

type UploadProps = {
  children?: React.ReactNode;
};

const Upload: React.FC<UploadProps> = () => {
  const [fileUploadData, setFileUploadData] = useState<FileWithUrlMap>(
    new Map()
  );
  const subscriptionRef = useRef<Subscription>();

  const setFileStatus = (id: string, status: string): void => {
    setFileUploadData((prev) => {
      const fileRef = prev.get(id)!;
      fileRef.status = status;

      return new Map([...prev, [id, fileRef]]);
    });
  };

  const unsubscribeIfSubscribedToFileStatusUpdates = (): void => {
    if (!subscriptionRef.current?.closed)
      subscriptionRef.current?.unsubscribe();
  };

  const subscribeFileStatusUpdates = (fileUploadData: FileWithUrlMap): void => {
    if (!fileUploadData) return;
    const syncExpressionObject: { or: { id: { eq: string } }[] } = {
      or: [],
    };
    for (const { id, status } of fileUploadData.values()) {
      if (status === 'ready') syncExpressionObject.or.push({ id: { eq: id } });
    }
    subscriptionRef.current = subscribeToFileUpdates(
      (message) => {
        const { data } = message;
        if (data) {
          const { onUpdateFileStatus } = data;
          if (onUpdateFileStatus) {
            const { id, status } = onUpdateFileStatus;
            if (!id || !status) return;
            console.debug('update received', onUpdateFileStatus);
            setFileStatus(id, status);
          }
        } else {
          console.debug('no data received');
        }
      },
      (err) => console.error(err),
      syncExpressionObject
    );
    console.debug('Listening for updates on files', fileUploadData.keys());
  };

  const onDropAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const filesWithUrls = await generateUploadUrls(acceptedFiles);
      setFileUploadData(filesWithUrls);
      unsubscribeIfSubscribedToFileStatusUpdates();
      subscribeFileStatusUpdates(filesWithUrls);
    },
    [fileUploadData]
  );

  const clear = useCallback(() => {
    unsubscribeIfSubscribedToFileStatusUpdates();
    setFileUploadData(new Map());
  }, []);

  return (
    <Flex
      paddingTop={'10px'}
      width={'80vw'}
      height={'100%'}
      direction={'column'}
    >
      {fileUploadData.size > 0 ? (
        <UploadingTable
          files={fileUploadData}
          setFileStatus={setFileStatus}
          onDone={unsubscribeIfSubscribedToFileStatusUpdates}
          goBack={clear}
        />
      ) : (
        <DropZone onDropAccepted={onDropAccepted} />
      )}
    </Flex>
  );
};

export default Upload;
