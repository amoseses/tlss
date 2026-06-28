import { installGlobalMonitoring, trackUserEvent } from "@/lib/monitoring";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

installGlobalMonitoring();
trackUserEvent("app_loaded", { path: window.location.pathname });

createRoot(document.getElementById("root")!).render(<App />);
