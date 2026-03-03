import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return;
    }

    const uri = process.env.MONGO_URI;

    if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
        console.error('\n❌ MONGO_URI is not configured correctly.');
        console.error('   Open server/.env and replace the MONGO_URI placeholder with your real MongoDB Atlas connection string.');
        console.error('   Get one for free at: https://cloud.mongodb.com\n');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 8000,
        });

        isConnected = true;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on('disconnected', () => {
            isConnected = false;
            console.warn('⚠️  MongoDB disconnected — will reconnect automatically.');
        });

        mongoose.connection.on('reconnected', () => {
            isConnected = true;
            console.log('✅ MongoDB reconnected.');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
            isConnected = false;
        });
    } catch (error) {
        console.error(`\n❌ MongoDB connection failed: ${error.message}`);
        console.error('   Check your MONGO_URI in server/.env — ensure the username, password, and cluster name are correct.');
        console.error('   Also whitelist your IP in MongoDB Atlas → Network Access.\n');
        process.exit(1);
    }
};

export default connectDB;
