/**
 * User model
 * 
 * Represents a user in the system with their Telegram information and event statistics
 */

const { getDb } = require('../db/connection');

const COLLECTION_NAME = 'users';

/**
 * Get or create a user
 * @param {Object} userData - User data from Telegram
 * @param {number} userData.id - Telegram user ID
 * @param {string} userData.username - Telegram username
 * @param {string} userData.firstName - User's first name
 * @returns {Promise<Object>} User object
 */
async function getOrCreateUser(userData) {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  const existingUser = await collection.findOne({ telegramId: userData.id });
  
  if (existingUser) {
    // Update user info if needed
    const updateData = {};
    if (userData.username && userData.username !== existingUser.username) {
      updateData.username = userData.username;
    }
    if (userData.firstName && userData.firstName !== existingUser.firstName) {
      updateData.firstName = userData.firstName;
    }
    
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await collection.updateOne(
        { telegramId: userData.id }, 
        { $set: updateData }
      );
      return { ...existingUser, ...updateData };
    }
    
    return existingUser;
  }
  
  // Create new user
  const newUser = {
    telegramId: userData.id,
    username: userData.username,
    firstName: userData.firstName,
    eventsCreated: 0,
    eventsApproved: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await collection.insertOne(newUser);
  return newUser;
}

/**
 * Increment user's event count
 * @param {number} telegramId - Telegram user ID
 * @param {boolean} approved - Whether the event was approved
 * @returns {Promise<Object>} Updated user
 */
async function incrementUserEventCount(telegramId, approved = false) {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  const updateData = {
    eventsCreated: 1
  };
  
  if (approved) {
    updateData.eventsApproved = 1;
  }
  
  const result = await collection.findOneAndUpdate(
    { telegramId },
    { 
      $inc: updateData,
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );
  
  return result.value;
}

/**
 * Get leaderboard of users by events created
 * @param {number} limit - Number of users to return
 * @returns {Promise<Array>} Array of users sorted by events created
 */
async function getLeaderboard(limit = 10) {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  return collection.find({
    eventsApproved: { $gt: 0 }
  })
  .sort({ eventsApproved: -1, eventsCreated: -1 })
  .limit(limit)
  .toArray();
}

module.exports = {
  getOrCreateUser,
  incrementUserEventCount,
  getLeaderboard
};
