import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import "./styles/index.css";

// Derive the router basename from the Vite base path so that sub-path
// deployments (e.g. /recipes-staging/) work correctly for all client-side
// routing, navigation, and browser back/forward behavior.
const RAW_BASE = import.meta.env.BASE_URL || "/";
const basename = RAW_BASE.replace(/\/+$/, "");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);