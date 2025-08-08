const moment = require("moment");
require("moment/locale/uk"); // Підключаємо українську локалізацію
moment.locale("uk"); // Встановлюємо українську локалізацію за замовчуванням

/**
 * Format an event for display in Telegram messages
 * @param {Object} event - Event object
 * @returns {string} Formatted event text with HTML formatting
 */
function formatEvent(event) {
  const date = moment(event.date).format("D MMMM YYYY [о] HH:mm");

  // Prioritize username and format with @ symbol if available
  let creatorDisplay;
  if (event.creator.username) {
    creatorDisplay = `@${event.creator.username}`;
  } else {
    creatorDisplay = event.creator.firstName || "Анонім";
  }

  let locationText = "Локація не визначена";
  if (event.location) {
    if (event.location.address) {
      // Check if the address contains a URL and format it as a clickable link
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      locationText = event.location.address.replace(
        urlRegex,
        (url) => `<a href="${url}">тиць</a>`
      );
    } else if (event.location.latitude && event.location.longitude) {
      // Create a Google Maps link for coordinates
      const mapsUrl = `https://maps.google.com/?q=${event.location.latitude},${event.location.longitude}`;
      locationText = `Координати: ${event.location.latitude}, ${event.location.longitude} (<a href="${mapsUrl}">тиць</a>)`;
    }
  }

  // Add description if available
  let descriptionText = "";
  if (event.description) {
    descriptionText = `<b>Деталі: </b>\n${event.description}`;
  }

  return (
    `<b>${event.title}</b>\n\n` +
    `<b>📆 Коли?</b> ${date}\n` +
    `<b>📍 Де?</b> ${locationText}\n` +
    `<b>👤 Хост:</b> ${creatorDisplay}\n` +
    descriptionText
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
