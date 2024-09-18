import { Heading, Text } from '@aws-amplify/ui-react';
import { useRouteError } from 'react-router-dom';

import Body from './Body';
import Header from './Header';

type RouterError = {
  statusText?: string;
  message: string;
};

export const ErrorPage: React.FC = () => {
  const error = useRouteError() as RouterError;
  console.error(error);

  return (
    <>
      <Header />
      <Body>
        <Heading level={1}>Oops!</Heading>
        <Text>Sorry, an unexpected error has occurred.</Text>
        <Text>
          <i>{error.statusText || error.message}</i>
        </Text>
      </Body>
    </>
  );
};
