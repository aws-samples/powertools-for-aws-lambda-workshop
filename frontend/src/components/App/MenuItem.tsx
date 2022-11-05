import React from "react";
import { useHref, useResolvedPath, useLocation, Link } from "react-router-dom";
import { Flex, Link as UiLink, useTheme } from "@aws-amplify/ui-react";

export type MenuItemProps = {
  children?: React.ReactNode;
  total: number;
  to: string;
  label: string;
};

const MenuItem: React.FC<MenuItemProps> = ({ total, to, label }) => {
  const href = useHref(to);
  let path = useResolvedPath(to);
  let location = useLocation();
  const theme = useTheme();

  let toPathname = path.pathname;
  let locationPathname = location.pathname;

  let isActive =
    locationPathname === toPathname ||
    (locationPathname.startsWith(toPathname) &&
      locationPathname.charAt(toPathname.length) === "/");

  return (
    <Flex
      alignItems="center"
      justifyContent={total === 1 ? "flex-start" : "center"}
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
