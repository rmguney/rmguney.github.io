import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const RAPIER_INIT_DEPRECATION = 'using deprecated parameters for the initialization function';
const forwardWarn = console.warn.bind(console);
console.warn = (...args: unknown[]): void => {
    if (typeof args[0] === 'string' && args[0].includes(RAPIER_INIT_DEPRECATION)) return;
    forwardWarn(...args);
};

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
