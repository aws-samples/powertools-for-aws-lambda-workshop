import React, { useState, useCallback, useRef } from 'react';
import { Flex } from '@aws-amplify/ui-react';
import { ZenObservable } from 'zen-observable-ts';

import DropZone from './DropZone';
import UploadingTable from './UploadingTable';
import { subscribeToFileUpdates } from '../../helpers/API';
import { FileWithUrlMap, generateUploadUrls } from './Upload.helpers';

type UploadProps = {
  children?: React.ReactNode;
};

const Upload: React.FC<UploadProps> = () => {
  const [fileUploadData, setFileUploadData] = useState<FileWithUrlMap>(
    new Map()
  );
  const subscriptionRef = useRef<ZenObservable.Subscription>();

  const setFileStatus = (id: string, status: string) => {
    setFileUploadData((prev) => {
      const fileRef = prev.get(id)!;
      fileRef.status = status;

      return new Map([...prev, [id, fileRef]]);
    });
  };

  const unsubscribeIfSubscribedToFileStatusUpdates = () => {
    if (!subscriptionRef.current?.closed)
      subscriptionRef.current?.unsubscribe();
  };

  const subscribeFileStatusUpdates = (fileUploadData: FileWithUrlMap) => {
    if (!fileUploadData) return;
    const syncExpressionObject: { or: { id: { eq: string } }[] } = {
      or: [],
    };
    for (const { id, status } of fileUploadData.values()) {
      if (status === 'ready') syncExpressionObject.or.push({ id: { eq: id } });
    }
    subscriptionRef.current = subscribeToFileUpdates(
      ({ value: { data, errors } }) => {
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
          if (errors) console.error('error received', errors);
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
