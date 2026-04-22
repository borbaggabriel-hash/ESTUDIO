import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initMagneticScroll } from "./lib/scroll-config";

initMagneticScroll();

createRoot(document.getElementById("root")!).render(<App />);
