import express, { Router, Response } from 'express';
import { uploadInvoice } from '../controllers/invoice.controller';
import authenticateJWT from '../middleware/auth';
import requireRole from '../middleware/requireRole';
import uploadMiddleware from '../utils/upload';

const router: Router = express.Router();

// Upload invoice from file and trigger workflow run (admin/manager)
router.post('/upload', 
  authenticateJWT, 
  requireRole(['admin', 'manager']), 
  uploadMiddleware,
  (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }
    const fileInfo = {
      path: req.file.path,
      originalname: req.file.originalname
    };
    req.body.fileInfo = fileInfo; // Pass file info to the next middleware
    next();
  },
  uploadInvoice
);

// Upload invoice from JSON data and trigger workflow run (admin/manager)
router.post('/', authenticateJWT, requireRole(['admin', 'manager']), uploadInvoice);

// Simple health
router.get('/health', (req: any, res: Response) => {
    res.json({ message: 'Invoices route working' });
});


export default router;
