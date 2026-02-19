import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

console.log('Mounting React App...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Root element found:', rootElement);
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
