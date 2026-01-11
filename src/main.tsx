import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Register Service Worker for caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
            // Service Worker registered successfully
        })
        .catch(() => {
            // Service Worker registration failed
        });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
