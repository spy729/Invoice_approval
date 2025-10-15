import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('Received file:', file.originalname, 'Type:', file.mimetype);
  
  // Accept these MIME types
  const allowed = [
    "application/pdf",
    "text/csv",
    "application/json",
    "application/octet-stream",
    "text/plain" // Some systems send CSV as text/plain
  ];
  
  // Also check file extension
  const validExt = /\.(pdf|csv|json)$/i.test(file.originalname);
  
  if (allowed.includes(file.mimetype) || validExt) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Got: ${file.mimetype}. File name: ${file.originalname}`), false);
  }
};

const upload = multer({
  storage
});

export default upload.single('file');