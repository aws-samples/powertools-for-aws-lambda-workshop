import { Flex, Link as UiLink, useTheme } from '@aws-amplify/ui-react';
import type React from 'react';
import { Link, useHref, useLocation, useResolvedPath } from 'react-router-dom';

export type MenuItemProps = {
  children?: React.ReactNode;
  total: number;
  to: string;
  label: string;
};

const MenuItem: React.FC<MenuItemProps> = ({ total, to, label }) => {
  const href = useHref(to);
  const path = useResolvedPath(to);
  const location = useLocation();
  const theme = useTheme();

  const toPathname = path.pathname;
  const locationPathname = location.pathname;

  const isActive =
    locationPathname === toPathname ||
    (locationPathname.startsWith(toPathname) &&
      locationPathname.charAt(toPathname.length) === '/');

  return (
    <Flex
      alignItems="center"
      justifyContent={total === 1 ? 'flex-start' : 'center'}
      width={`calc(100% / ${total})`}
    >
      <UiLink
        as={Link}
        to={href}
        color={
          isActive
            ? theme.tokens.colors.font.active
            : theme.tokens.colors.font.interactive
        }
        fontWeight={theme.tokens.fontWeights.bold}
      >
        {label}
      </UiLink>
    </Flex>
  );
};

export default MenuItem;
