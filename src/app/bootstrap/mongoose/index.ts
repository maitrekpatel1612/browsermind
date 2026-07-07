import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export function dbConnection() : void {
    mongoose
    .connect(process.env.MONGO_URI as string)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));
}