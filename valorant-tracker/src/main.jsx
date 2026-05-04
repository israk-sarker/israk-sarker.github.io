// ============================================
// main.jsx — React entry point
// ============================================
// This file is the very first thing that runs.
// It takes our App component and puts it into the HTML page.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// createRoot tells React which HTML element to render into
// document.getElementById("root") finds the <div id="root"> in index.html
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
