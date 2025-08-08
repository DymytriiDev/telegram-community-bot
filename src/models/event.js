/**
 * Event model
 * 
 * Represents an event in the system with title, date, location, and creator information
 */

const { getDb } = require('../db/connection');

const COLLECTION_NAME = 'events';

/**
 * Create a new event
 * @param {Object} eventData - Event data
 * @param {string} eventData.title - Event title (what)
 * @param {Date} eventData.date - Event date and time (when)
 * @param {Object} eventData.location - Event location (where)
 * @param {number} eventData.location.latitude - Location latitude
 * @param {number} eventData.location.longitude - Location longitude
 * @param {string} eventData.location.address - Location address (if available)
 * @param {Object} eventData.creator - Event creator
 * @param {number} eventData.creator.id - Creator Telegram ID
 * @param {string} eventData.creator.username - Creator username
 * @param {string} eventData.creator.firstName - Creator first name
 * @param {boolean} eventData.approved - Whether the event is approved by admin
 * @param {string} eventData.messageId - ID of the message in the group (after approval)
 * @returns {Promise<Object>} Created event
 */
async function createEvent(eventData) {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  const event = {
    ...eventData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await collection.insertOne(event);
  return { ...event, _id: result.insertedId };
}

/**
 * Get event by ID
 * @param {string} id - Event ID
 * @returns {Promise<Object|null>} Event or null if not found
 */
async function getEventById(id) {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  return collection.findOne({ _id: id });
}

/**
 * Update event
 * @param {string} id - Event ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated event
 */
async function updateEvent(id, updateData) {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  const update = {
    ...updateData,
    updatedAt: new Date()
  };
  
  await collection.updateOne({ _id: id }, { $set: update });
  return getEventById(id);
}

/**
 * Get upcoming events
 * @returns {Promise<Array>} Array of upcoming events
 */
async function getUpcomingEvents() {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  const now = new Date();
  
  return collection.find({
    date: { $gte: now },
    approved: true
  }).sort({ date: 1 }).toArray();
}

/**
 * Get past events
 * @returns {Promise<Array>} Array of past events
 */
async function getPastEvents() {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  const now = new Date();
  
  return collection.find({
    date: { $lt: now },
    approved: true
  }).sort({ date: -1 }).toArray();
}

/**
 * Delete event
 * @param {string} id - Event ID
 * @returns {Promise<boolean>} Whether the event was deleted
 */
async function deleteEvent(id) {
  const db = getDb();
  const collection = db.collection(COLLECTION_NAME);
  
  const result = await collection.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

module.exports = {
  createEvent,
  getEventById,
  updateEvent,
  getUpcomingEvents,
  getPastEvents,
  deleteEvent
};
