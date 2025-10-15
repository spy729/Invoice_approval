          
// upload.controller.ts (or similar)
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Workflow from '../models/Workflow';
import runService from '../services/run.service';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

const pdfParse = require('pdf-parse'); // classic API, returns a promise

export async function uploadInvoice(req: AuthRequest, res: Response) {
  try {
    let invoiceData: any = null;
    const file = req.file;

    if (file) {
      const filePath = file.path;

      // Verify file exists
      try {
        await fsp.access(filePath);
      } catch {
        return res.status(400).json({ error: 'File upload failed or was not saved' });
      }

      const lower = file.originalname.toLowerCase();
      if (lower.endsWith('.pdf')) {
        // PDF parsing
        try {
          console.log('PDF upload:', {
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            originalname: file.originalname
          });
          const dataBuffer = await fsp.readFile(filePath);
          const pdfData = await pdfParse(dataBuffer);
          // Extract details from PDF text using regex
          const text = pdfData.text || '';
          // Example regex patterns (adjust as needed for your invoice format)
          const invoiceNumberMatch = text.match(/invoice\s*number[:\s]*([A-Za-z0-9-]+)/i);
          const dateMatch = text.match(/date[:\s]*([0-9]{2,4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i);
          const totalAmountMatch = text.match(/total\s*amount[:\s]*([\d,.]+)/i);
          const productNameMatch = text.match(/product\s*name[:\s]*([A-Za-z0-9 \-]+)/i);

          const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : null;
          const date = dateMatch ? dateMatch[1] : null;
          const totalAmount = totalAmountMatch ? totalAmountMatch[1] : null;
          const productName = productNameMatch ? productNameMatch[1] : null;

          console.log('Extracted invoice details:', {
            invoiceNumber,
            date,
            totalAmount,
            productName
          });

          invoiceData = {
            invoiceNumber,
            date,
            totalAmount,
            productName,
            content: text,
            numpages: pdfData.numpages || 0,
            info: pdfData.info || {},
            metadata: pdfData.metadata || {},
            filename: file.originalname
          };
          console.log("invoice data : " , invoiceData);
        } catch (e) {
          console.error('PDF parse error:', e);
          await safeUnlink(filePath);
          return res.status(400).json({ error: 'Invalid PDF file or unable to parse PDF content' });
        }
      } else if (lower.endsWith('.json')) {
        try {
          const fileContent = await fsp.readFile(filePath, 'utf-8');
          invoiceData = JSON.parse(fileContent);
        } catch (e) {
          await safeUnlink(filePath);
          return res.status(400).json({ error: 'Invalid JSON file format' });
        }
      } else if (lower.endsWith('.csv')) {
        try {
          const fileContent = await fsp.readFile(filePath, 'utf-8');
          const records = parse(fileContent, { columns: true, skip_empty_lines: true });
          if (!records || records.length === 0) {
            await safeUnlink(filePath);
            return res.status(400).json({ error: 'CSV file is empty' });
          }
          // If CSV contains multiple rows, we store them as an array; commonly one invoice per file, but flexible.
          invoiceData = records.length === 1 ? records[0] : records;
        } catch (e) {
          await safeUnlink(filePath);
          return res.status(400).json({ error: 'Invalid CSV file format' });
        }
      } else {
        await safeUnlink(filePath);
        return res.status(400).json({ error: 'Unsupported file type. Only JSON, CSV, and PDF files are allowed.' });
      }

      // Do not delete uploaded file; keep it in uploads folder

    } else {
      // No file: read JSON body payload
      invoiceData = req.body && Object.keys(req.body).length > 0 ? req.body : null;
    }


    // Normalize invoice data
    invoiceData.createdBy = req.user?.id ?? invoiceData.createdBy;

    // Save invoice
    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Find active workflow for the company if companyId exists
    let workflow = null;
    if (invoice.companyId) {
      workflow = await Workflow.findOne({ companyId: invoice.companyId, isActive: true }).sort({ createdAt: -1 });
    }

    if (!workflow) {
      return res.status(201).json({ invoice, run: null, message: 'No active workflow for company' });
    }

    // Kick off run (runService.executeWorkflowRun should accept workflow doc or ID and invoice)
    const run = await runService.executeWorkflowRun(workflow, invoice);
    return res.status(201).json({ invoice, run });
  } catch (err: any) {
    console.error('uploadInvoice error:', err);
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid file format: Could not parse JSON' });
    }
    if (err.code === 'ENOENT') {
      return res.status(400).json({ error: 'File not found or could not be read' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// helper: unlink but swallow ENOENT
async function safeUnlink(filePath: string) {
  try {
    await fsp.unlink(filePath);
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export default { uploadInvoice };
