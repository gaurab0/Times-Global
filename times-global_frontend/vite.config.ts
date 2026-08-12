import { defineConfig } from 'vite'; // ConfigEnv type import removed as it's not used
import react from '@vitejs/plugin-react'; 
import { fileURLToPath } from 'node:url';
// basicSsl plugin import removed as server.https is false or undefined

// Define your CSP string
const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' for importmap in index.html and potentially some Tailwind JIT styles
  // 'unsafe-eval' for Babel Standalone for JSX transpilation
  "script-src 'self' https://cdn.tailwindcss.com https://esm.sh https://unpkg.com 'unsafe-inline' 'unsafe-eval'", 
  "style-src 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com 'unsafe-inline'", 
  "img-src 'self' http: https: data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' http: https: ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'" 
].join('; ');

// The 'mode' parameter from ConfigEnv is not used since loadEnv (for Gemini API keys) was removed.
// So, we can simplify the function signature.
export default defineConfig(() => { 
    return {
      plugins: [
        react(), 
      ],
      resolve: {
        alias: {
          // Using new URL for robust path resolution in ES modules
          // This assumes your main source files (like index.tsx) are at the root. 
          // If your source files are in a 'src' folder, it would typically be:
          // '@': new URL('./src', import.meta.url).pathname, 
          '@': fileURLToPath(new URL('.', import.meta.url)), 
        }
      },
       server: {
        host: true, // Allows access from network (e.g., your IP)
        // https: false, // Vite defaults to HTTP if 'https' and SSL plugin are not configured
        // port: 5173, // Vite's default, uncomment to change
        proxy: {
          '/api': {
            target: process.env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8000',
            changeOrigin: true,
          },
        },
        headers: { 
          'Content-Security-Policy': cspDirectives
        }
      }
    };
});
