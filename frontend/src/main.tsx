import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify, Auth } from "aws-amplify";
import awsmobile from "./aws-exports.cjs";

const customHeader = async () => ({
  Authorization: `${(await Auth.currentSession())
    .getAccessToken()
    .getJwtToken()}`,
});

// @ts-ignore
awsmobile.API.endpoints[0].custom_header = customHeader;
Amplify.configure(awsmobile);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Authenticator loginMechanisms={["email"]}>
      <App />
    </Authenticator>
  </React.StrictMode>
);
