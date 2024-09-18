import type React from 'react';
import { Outlet } from 'react-router-dom';

import Body from './Body';
import Header from './Header';

type AppProps = Record<string, unknown>;

const App: React.FC<AppProps> = () => {
  return (
    <>
      <Header />
      <Body>
        <Outlet />
      </Body>
    </>
  );
};

export default App;
