import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './components/App';
import 'normalize.css';
import '@aws-amplify/ui-react/styles.css';
import './index.css';
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import awsmobile from './aws-exports.cjs';

import { ErrorPage } from './components/App/ErrorPage';
import Settings from './components/Settings';
import Upload from './components/Upload';

Amplify.configure(awsmobile);

const theme = {
  name: 'workshop-theme',
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Upload />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <Authenticator
        loginMechanisms={['email']}
        formFields={{
          signIn: {
            username: {
              isReadOnly: true,
              defaultValue: 'dummyuser+1@example.com',
            },
            password: {
              isReadOnly: true,
              defaultValue: 'ABCabc123456789!',
            },
          },
        }}
      >
        <RouterProvider router={router} />
      </Authenticator>
    </ThemeProvider>
  </React.StrictMode>
);
