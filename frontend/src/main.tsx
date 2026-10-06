import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WorkspaceProvider } from './providers/WorkspaceProvider';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </React.StrictMode>
);
