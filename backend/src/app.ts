import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Route modules (implemented as stubs if not present)
import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import invoiceRoutes from './routes/invoices';
import usersRoutes from './routes/users';
import runsRoutes from './routes/runs';
// import runRoutes from './routes/runs';
import errorHandler from './middleware/errorHandler';

const app: Express = express();

// Middlewares
// Enable CORS for development
// Allowed origins (include your deployed frontend and backend URLs)
const defaultOrigins = [
  'http://localhost:8081',
  'http://localhost:4000',
  'https://invoice-approval.vercel.app',
  'https://invoice-approval-iv8n.onrender.com'
];

// If `CORS_ALLOWED_ORIGINS` is set in env it can contain a comma-separated list of origins
// Also accept a single `FRONTEND_URL` env var for convenience. These are appended to defaults.
const envOrigins: string[] = [];
if (process.env.CORS_ALLOWED_ORIGINS) {
  envOrigins.push(...process.env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean));
}
if (process.env.FRONTEND_URL) {
  envOrigins.push(process.env.FRONTEND_URL.trim());
}

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
console.log('[app] allowed CORS origins:', allowedOrigins);


app.use(cors({
  origin: true, // reflect request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Add cookie parser middleware
app.use(cookieParser());

// Add headers for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  // Echo back any origin when present. This works together with `cors({ origin: true })` above.
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Content-Length, X-Requested-With');
  next();
});
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from /public (backend/public)
// When compiled, __dirname will be something like backend/dist, so resolve
// to the sibling 'public' directory inside the backend package.
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Health route
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/runs', runsRoutes);
// TODO: Uncomment when runs feature is implemented
// app.use('/api/runs', runRoutes);

// Generic error handler (should be last middleware)
app.use(errorHandler);

// SPA fallback: serve index.html for any non-API route so React client-side routing works
// Note: express.static() handles file requests first, this catches everything else
app.get('/', (req: Request, res: Response, next: NextFunction) => {
  // If the request is for an API path, skip to next
  if (req.path.startsWith('/api')) return next();

  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) next(err);
  });
});

export default app;
