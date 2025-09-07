const commandsMsg =
  "/create - Створити нову подію\n" +
  "/events - Переглянути майбутні події\n" +
  "/past - Переглянути минулі події\n" +
  "/leaderboard - ТОП організаторів\n" +
  "/restart - Перезапустити бота (якщо щось не так)";

const startMsg =
  "Привіт! Я бот для організації подій спільноти! 🎉\n\n" +
  "Використовуй ці команди для взаємодії:\n" +
  commandsMsg;

const errorMsg = "Вибачте, сталася помилка при отриманні топу організаторів.";

const dateFormatMsg = "<b>25 жовтня 18:00</b> або <b>25.10, 18:00</b>";

module.exports = {
  startMsg,
  commandsMsg,
  errorMsg,
  dateFormatMsg,
};
