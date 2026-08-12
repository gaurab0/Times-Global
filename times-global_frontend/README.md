# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app and local Django backend:
   `npm run dev`

The frontend uses `/api` in development and Vite proxies those requests to
`http://127.0.0.1:8000`. To point at another backend, set
`VITE_API_BASE_URL` or `VITE_BACKEND_ORIGIN`.
