import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { enforceRememberMe } from "./lib/rememberMeStorage";
import "./index.css";

// Clear stale auth session if user didn't opt into "Remember me"
// and this is a new browser session (tab/window was closed and reopened).
enforceRememberMe();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
