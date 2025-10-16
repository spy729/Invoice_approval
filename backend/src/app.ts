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

// Allow origins from env for deployment
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://localhost:4000').split(',');
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Add cookie parser middleware
app.use(cookieParser());

// Add headers for all responses (deployment ready)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
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

// Use API_BASE_URL from env, default to '/api'
const API_BASE_URL = process.env.API_BASE_URL || '/api';
app.use(`${API_BASE_URL}/auth`, authRoutes);
app.use(`${API_BASE_URL}/workflows`, workflowRoutes);
app.use(`${API_BASE_URL}/invoices`, invoiceRoutes);
app.use(`${API_BASE_URL}/users`, usersRoutes);
app.use(`${API_BASE_URL}/runs`, runsRoutes);
// TODO: Uncomment when runs feature is implemented
// app.use(`${API_BASE_URL}/runs`, runRoutes);

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
