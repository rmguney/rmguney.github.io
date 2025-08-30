import "@/styles/globals.css";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Suppress HMR console errors in development
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = function(message) {
        if (typeof message === 'string' && 
            (message.includes('HMR') || message.includes('Invalid message'))) {
          return; // Suppress HMR-related errors
        }
        originalError.apply(console, arguments);
      };
    }
  }, []);

  return <Component {...pageProps} />;
}
