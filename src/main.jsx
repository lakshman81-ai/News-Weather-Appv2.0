import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { registerSW } from './registerSW'
import { runScoringTests } from './utils/testScoring.js';

// Expose scoring test for manual verification
if (typeof window !== 'undefined') {
    window.runScoringTests = runScoringTests;
}

registerSW();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
