import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reminderScheduler } from "./utils/reminderScheduler";

// Start background cron reminder scheduler
reminderScheduler.start(60000); // scan every 60 seconds

createRoot(document.getElementById("root")!).render(<App />);



