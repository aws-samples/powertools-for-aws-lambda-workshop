import { Flex, Text, useTheme } from '@aws-amplify/ui-react';
import type React from 'react';
import { useCallback } from 'react';
import {
  type DropEvent,
  type FileRejection,
  useDropzone,
} from 'react-dropzone';

type DropZoneProps = {
  children?: React.ReactNode;
  onDropAccepted: <T extends File>(files: T[], event: DropEvent) => void;
};

const DropZone: React.FC<DropZoneProps> = ({ onDropAccepted }) => {
  const { tokens } = useTheme();

  const onDropRejected = useCallback((rejectedFiles: FileRejection[]) => {
    console.log(rejectedFiles[0]);
    alert(
      `${rejectedFiles[0].file.name} is invalid.\n${rejectedFiles[0].errors[0].message}`
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted,
    onDropRejected,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/json': [],
      'video/mp4': [],
      'video/webm': [],
    },
    multiple: true,
    maxFiles: 10,
  });

  return (
    <Flex
      as="div"
      flex={1}
      maxHeight={'40%'}
      margin={'auto 0'}
      direction={'column'}
      alignItems={'center'}
      justifyContent={'center'}
      border={`${tokens.borderWidths.medium} dashed ${
        isDragActive
          ? tokens.colors.border.pressed
          : tokens.colors.border.secondary
      }`}
      borderRadius={tokens.radii.small}
      backgroundColor={tokens.colors.background.secondary}
      color={tokens.colors.font.primary}
      style={{
        outline: 'none',
        transition: 'border .24s ease-in-out',
      }}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <>
          <svg
            role="graphics-symbol"
            width="24"
            height="24"
            xmlns="http://www.w3.org/2000/svg"
            fillRule="evenodd"
            clipRule="evenodd"
          >
            <path d="M0 2h8l3 3h10v4h3l-4 13h-20v-20zm22.646 8h-17.907l-3.385 11h17.907l3.385-11zm-2.646-1v-3h-9.414l-3-3h-6.586v15.75l3-9.75h16z" />
          </svg>
          <Text fontWeight={tokens.fontWeights.semibold}>
            Drop the files here ...
          </Text>
        </>
      ) : (
        <>
          <svg
            width="24"
            height="24"
            xmlns="http://www.w3.org/2000/svg"
            fillRule="evenodd"
            clipRule="evenodd"
          >
            <path d="M11 5h13v17h-24v-20h8l3 3zm-10-2v18h22v-15h-12.414l-3-3h-6.586z" />
          </svg>
          <Text fontWeight={tokens.fontWeights.semibold}>
            Drop your files here or click here to upload
          </Text>
        </>
      )}
    </Flex>
  );
};

export default DropZone;
