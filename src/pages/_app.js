import "@/styles/globals.css";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Suppress HMR console errors in development
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = function(...args) {
        // Convert all arguments to string for checking
        const message = args.join(' ');
        if (message.includes('HMR') || 
            message.includes('Invalid message') ||
            message.includes('Cannot read properties of undefined') ||
            message.includes('isrManifest') ||
            message.includes('handleStaticIndicator')) {
          return; // Suppress HMR-related errors
        }
        originalError.apply(console, args);
      };
    }
    
    // Register Service Worker for caching
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // Service Worker registered successfully
        })
        .catch(() => {
          // Service Worker registration failed
        });
    }
  }, []);

  return <Component {...pageProps} />;
}
