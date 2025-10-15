# Invoice_approval (Integrated Frontend + Backend)

This workspace uses the `react-github-canvas` project as the single frontend. The backend (Express + TypeScript) serves the production build from `backend/public`.

Development
1. Start the backend (API server):

```powershell
cd "c:\Users\agarw\OneDrive\Desktop\flowbit\Invoice_approval\backend"
npm install
npm run dev
```

2. Start the frontend dev server (Vite) in a separate terminal. Vite is configured to proxy `/api` to the backend.

```powershell
cd "c:\Users\agarw\OneDrive\Desktop\flowbit\react-github-canvas"
npm install
npm run dev
```

Production build (frontend will be built into `backend/public` and served by the backend)

```powershell
cd "c:\Users\agarw\OneDrive\Desktop\flowbit\Invoice_approval\backend"
npm run frontend:install
npm run frontend:build
npm run build
npm start
```

Notes
- The Vite config in `react-github-canvas/vite.config.ts` is already set to output the production build into `Invoice_approval/backend/public` relative to the workspace.
- The backend includes an SPA fallback that serves `index.html` for non-API routes so client-side routing works.
Integration notes

What I did:
- Replaced the existing `frontend` folder with the provided `react-github-canvas` app (copied into `Invoice_approval/frontend`).
- Added a `vite.config.ts` in `Invoice_approval/frontend` which builds the React app into `Invoice_approval/backend/public` so the backend can serve static assets.
- Adjusted backend static path in `backend/src/app.ts` to serve files from its `public` directory.
- Added convenience npm scripts in `backend/package.json`:
  - `frontend:install` - install frontend dependencies (run from backend folder)
  - `frontend:build` - build the frontend into `backend/public`
  - `build:all` - build frontend then TypeScript backend

How to install and run (from powershell):

1. Install backend dependencies
   cd Invoice_approval/backend; npm install

2. Install frontend dependencies
   npm run frontend:install

3. Build frontend into backend/public
   npm run frontend:build

4. Build backend and start
   npm run build
   npm start

Development (run frontend and backend separately):
- Frontend dev server: cd Invoice_approval/frontend; npm run dev (runs Vite on port 8080)
- Backend dev server: cd Invoice_approval/backend; npm run dev (ts-node-dev)

Notes & caveats:
- You must run `npm install` in both backend and frontend (or use the backend script `frontend:install`).
- The frontend has many dependencies (React, Vite, Tailwind, Radix, React Flow, etc.). Installing them may take a while.
- I copied the main app files and several UI components required by the pages. If you see missing imports during dev, run `npm install` in the frontend and the errors should resolve.

If you want, I can:
- Add a single root-level script to install all dependencies and build everything.
- Wire a backend route to serve index.html for client-side routing (i.e., fallback to index.html for unknown routes).
- Remove the original react-github-canvas copy or move it into the frontend folder instead of copying.
