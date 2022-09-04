import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify, Auth } from "aws-amplify";

const customHeader = async () => ({
  Authorization: `${(await Auth.currentSession())
    .getAccessToken()
    .getJwtToken()}`,
});

Amplify.configure({
  Auth: {
    identityPoolId: "eu-west-1:5d1e1c37-c128-4460-a00c-10873c4d045c",
    region: "eu-west-1",
    userPoolId: "eu-west-1_XZoRhrD3s",
    userPoolWebClientId: "5v248h7umdo2cvv0jg396ornl5",
  },
  API: {
    endpoints: [
      {
        name: "direct",
        endpoint: "https://mkbs9t2opc.execute-api.eu-west-1.amazonaws.com/api",
        region: "eu-west-1",
        custom_header: customHeader,
      },
      {
        name: "main",
        endpoint: "https://d272erwjl1euor.cloudfront.net/api",
        region: "eu-west-1",
        custom_header: customHeader,
      },
    ],
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Authenticator loginMechanisms={["email"]}>
      <App />
    </Authenticator>
  </React.StrictMode>
);
