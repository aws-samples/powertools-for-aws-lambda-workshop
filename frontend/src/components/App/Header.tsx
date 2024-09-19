import {
  Button,
  Flex,
  Image,
  Link as UiLink,
  useAuthenticator,
  useTheme,
} from '@aws-amplify/ui-react';
import type React from 'react';
import { Link as ReactRouterLink } from 'react-router-dom';

import MenuItem from './MenuItem';

const ITEMS = [
  {
    to: '/',
    label: 'Upload',
  },
  {
    to: '/settings',
    label: 'Settings',
  },
];

const Header: React.FC = () => {
  const { signOut } = useAuthenticator();
  const { tokens } = useTheme();

  return (
    <Flex
      as="header"
      backgroundColor={tokens.colors.background.tertiary}
      height={tokens.space.xxl}
      gap="0"
      justifyContent="center"
      direction="row"
      padding={`${tokens.space.xxxs.value} ${tokens.space.medium}`}
    >
      <Flex
        width="10vw"
        height="100%"
        alignItems="center"
        justifyContent="flex-start"
      >
        <UiLink as={ReactRouterLink} to="/" display="inline-flex" height="100%">
          <Image height="100%" src="/aws_logo.svg" alt="Amazon Web Services" />
        </UiLink>
      </Flex>
      <Flex
        width="80vw"
        height="100%"
        alignItems="center"
        justifyContent="center"
      >
        {ITEMS.map((item, idx) => (
          <MenuItem
            key={idx}
            to={item.to}
            label={item.label}
            total={ITEMS.length}
          />
        ))}
      </Flex>
      <Flex
        width="10vw"
        height="100%"
        alignItems="center"
        justifyContent="flex-end"
      >
        <Button
          variation="primary"
          size="small"
          onClick={() => {
            signOut();
            setTimeout(() => {
              window.location.replace('/');
            }, 1000);
          }}
        >
          Sign out
        </Button>
      </Flex>
    </Flex>
  );
};

export default Header;
