import { Flex, useTheme } from '@aws-amplify/ui-react';
import type React from 'react';

type BodyProps = {
  children?: React.ReactNode;
};

const Body: React.FC<BodyProps> = ({ children }) => {
  const { tokens } = useTheme();

  return (
    <Flex
      width={'100vw'}
      height={`calc(100vh - ${tokens.space.xxl})`}
      maxHeight={'100%'}
      maxWidth={'100%'}
      direction={'column'}
      justifyContent={'center'}
      alignItems={'center'}
      margin={0}
      padding={0}
    >
      {children}
    </Flex>
  );
};

export default Body;
