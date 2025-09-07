const commandsMsg =
  "/create - Створити нову подію\n" +
  "/events - Переглянути майбутні події\n" +
  "/past - Переглянути минулі події\n" +
  "/leaderboard - Переглянути топ організаторів\n" +
  "/restart - Перезапустити бота (якщо щось не так)";

const startMsg =
  "Привіт! Я бот для організації подій спільноти! 🎉\n\n" +
  "Використовуй ці команди для взаємодії:\n" +
  commandsMsg;

const errorMsg = "Вибачте, сталася помилка при отриманні топу організаторів.";

module.exports = {
  startMsg,
  commandsMsg,
  errorMsg,
};
