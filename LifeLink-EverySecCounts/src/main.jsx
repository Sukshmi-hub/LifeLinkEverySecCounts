import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { serverUrl } from "@/lib/serverConfig";

console.log("API URL:", serverUrl);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
