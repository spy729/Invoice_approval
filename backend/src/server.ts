import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db';
import app from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function start() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }
    await connectDB(process.env.MONGO_URI);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
