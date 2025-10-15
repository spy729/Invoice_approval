import mongoose from 'mongoose';

async function connectDB(uri?: string) {
  const mongoUri = uri || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MongoDB URI is not provided. Set MONGO_URI in environment or pass it to connectDB().');
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');
    return mongoose.connection;
  } catch (err) {
    console.error('MongoDB connection error:', (err as Error).message || err);
    throw err;
  }
}

export { connectDB };
export default connectDB;
