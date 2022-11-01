import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify, Auth } from "aws-amplify";
import awsmobile from "./aws-exports.cjs";

Amplify.configure(awsmobile);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Authenticator loginMechanisms={["email"]}>
      <App />
    </Authenticator>
  </React.StrictMode>
);
