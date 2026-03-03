/**
 * clearUsers.js
 * Deletes ALL users (host + driver + admin) from MongoDB.
 * Run once with:  node scripts/clearUsers.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('❌  MONGO_URI not found in server/.env');
    process.exit(1);
}

await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
console.log('✅  Connected to MongoDB');

const db = mongoose.connection.db;

// 1️⃣  Delete all users
const usersResult = await db.collection('users').deleteMany({});
console.log(`🗑️   Deleted ${usersResult.deletedCount} user(s)`);

// 2️⃣  Also wipe bookings & spots so orphaned data doesn't remain
const bookingsResult = await db.collection('bookings').deleteMany({});
console.log(`🗑️   Deleted ${bookingsResult.deletedCount} booking(s)`);

const spotsResult = await db.collection('parkingspots').deleteMany({});
console.log(`🗑️   Deleted ${spotsResult.deletedCount} parking spot(s)`);

console.log('\n✨  Database is clean — fresh start ready!\n');
await mongoose.disconnect();
process.exit(0);
