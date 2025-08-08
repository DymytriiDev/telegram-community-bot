const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

/**
 * Connect to MongoDB
 * @returns {Promise<object>} MongoDB database instance
 */
async function connectToDatabase() {
  try {
    if (db) return db;
    
    await client.connect();
    console.log('Connected to MongoDB');
    
    db = client.db();
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Close the MongoDB connection
 */
async function closeDatabaseConnection() {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

module.exports = {
  connectToDatabase,
  closeDatabaseConnection,
  getDb: () => db
};
