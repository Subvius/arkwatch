import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import './styles/globals.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
