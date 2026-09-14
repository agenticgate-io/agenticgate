import { Component, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage.js";
import ControlDeckPage from "./pages/ControlDeckPage.js";
import LineWaves from "./components/LineWaves.js";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", color: "#f87171", fontFamily: "monospace", background: "#07090d", minHeight: "100vh" }}>
          <h2 style={{ color: "#fb923c" }}>Runtime Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {(this.state.error as Error).message}
            {"\n\n"}
            {(this.state.error as Error).stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-bg-layer" aria-hidden>
        <LineWaves
          speed={0.12}
          innerLineCount={32}
          outerLineCount={36}
          warpIntensity={1}
          rotation={-45}
          edgeFadeWidth={0}
          colorCycleSpeed={1}
          brightness={0.35}
          color1="#ffffff"
          color2="#ffffff"
          color3="#ffffff"
          enableMouseInteraction
          mouseInfluence={2}
        />
      </div>

      <div className="app-main-layer">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/control"
            element={
              <ErrorBoundary>
                <ControlDeckPage />
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
