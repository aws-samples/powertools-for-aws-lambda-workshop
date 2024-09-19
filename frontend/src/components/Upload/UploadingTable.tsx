import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@aws-amplify/ui-react';
import type React from 'react';
import { useEffect, useState } from 'react';

import FileUpload from './FileUpload';
import type { FileWithUrlMap } from './Upload.helpers';

type UploadingTableProps = {
  children?: React.ReactNode;
  files: FileWithUrlMap;
  setFileStatus: (id: string, status: string) => void;
  goBack: () => void;
  onDone: () => void;
};

const UploadingTable: React.FC<UploadingTableProps> = ({
  files,
  setFileStatus,
  onDone,
  goBack,
}) => {
  const [isMoreButtonEnabled, setIsMoreButtonEnabled] = useState(false);

  useEffect(() => {
    if (files.size === 0) return;

    let allFileProcessed = true;
    for (const file of files.values()) {
      if (!['completed', 'failed'].includes(file.status))
        allFileProcessed = false;
    }
    if (allFileProcessed) {
      console.info(
        'All files are completed, unsubscribing from onUpdatePosition AppSync mutation'
      );
      onDone();
      setIsMoreButtonEnabled(true);
    }
  }, [files, onDone]);

  const fileUploadComponents = [];
  for (const file of files.values()) {
    fileUploadComponents.push(
      <FileUpload key={file.id} {...file} setFileStatus={setFileStatus} />
    );
  }

  if (fileUploadComponents.length === 0) return null;

  return (
    <>
      <Table caption="" highlightOnHover={true}>
        <TableHead>
          <TableRow>
            <TableCell width={'40%'} as="th">
              File
            </TableCell>
            <TableCell width={'40%'} as="th">
              Status
            </TableCell>
            <TableCell width={'20%'} as="th">
              Action
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{fileUploadComponents}</TableBody>
      </Table>
      {isMoreButtonEnabled ? (
        <Button
          variation="primary"
          size="small"
          width={'40%'}
          margin={'auto'}
          onClick={goBack}
        >
          Process more files
        </Button>
      ) : null}
    </>
  );
};

export default UploadingTable;
