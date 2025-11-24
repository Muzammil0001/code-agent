import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx: Script loaded');
console.log('main.tsx: Looking for #root element...');
const rootElement = document.getElementById('root');
console.log('main.tsx: Root element found:', rootElement);

if (rootElement) {
  console.log('main.tsx: Creating React root...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('main.tsx: React app rendered');
} else {
  console.error('main.tsx: ROOT ELEMENT NOT FOUND!');
}
