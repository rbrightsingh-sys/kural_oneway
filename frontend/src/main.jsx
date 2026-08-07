import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import "./index.css";

// No router library — the app only has two screens, so a plain path check
// is enough. Vite's dev server already falls back to index.html for
// non-file routes, so navigating straight to /dashboard works. If you ever
// deploy the built app to a static host, make sure it has an SPA fallback
// (serve index.html for unknown paths) or /dashboard will 404 on refresh.
const isDashboard = window.location.pathname.startsWith("/dashboard");
const Root = isDashboard ? Dashboard : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
