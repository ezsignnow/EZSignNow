import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// The reminder scheduler is started/stopped from AuthContext based on
// auth state, not unconditionally here — see the comment there for why.

createRoot(document.getElementById("root")!).render(<App />);



