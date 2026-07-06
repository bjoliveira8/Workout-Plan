import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// localStorage-backed shim matching the Claude-artifact window.storage API.
// The component only ever talks to window.storage, so it runs unmodified
// both as a Claude artifact (host provides storage) and as a static site (this shim).
window.storage = {
  async get(key) {
    const value = window.localStorage.getItem(key);
    if (value == null) throw new Error("key not found");
    return { key, value };
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
    return { key, value };
  },
};

createRoot(document.getElementById("root")).render(React.createElement(App));
