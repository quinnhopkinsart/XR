import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
// Self-hosted type: Comfortaa (round monoline n, after the logo) and Nunito for reading.
import '@fontsource/comfortaa/400.css';
import '@fontsource/comfortaa/500.css';
import '@fontsource/comfortaa/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/400-italic.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import './brand/tokens.css';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
