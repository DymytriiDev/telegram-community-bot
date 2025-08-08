const moment = require("moment");

/**
 * Format an event for display in Telegram messages
 * @param {Object} event - Event object
 * @returns {string} Formatted event text with HTML formatting
 */
function formatEvent(event) {
  const date = moment(event.date).format("MMMM D, YYYY [at] h:mm A");
  const creatorName =
    event.creator.firstName || event.creator.username || "Anonymous";

  let locationText = "Локація не визначена";
  if (event.location) {
    if (event.location.address) {
      locationText = event.location.address;
    } else if (event.location.latitude && event.location.longitude) {
      locationText = `Координати: ${event.location.latitude}, ${event.location.longitude}`;
    }
  }

  return (
    `<b>${event.title}</b>\n\n` +
    `<b>📆 Коли?</b> ${date}\n` +
    `<b>📍 Де?</b> ${locationText}\n` +
    `<b>👤 Хост:</b> ${creatorName}`
  );
}

/**
 * Format a date for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return moment(date).format("MMMM D, YYYY [at] h:mm A");
}

module.exports = {
  formatEvent,
  formatDate,
};
