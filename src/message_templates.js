const commandsMsg =
  "/events - Найближчі зустрічі\n" +
  "/create - Створити нову зустріч\n" +
  "/past - Архів зустрічей\n" +
  "/leaderboard - ТОП організаторів\n" +
  "/restart - Перезапустити бота, якщо щось не так";

const startMsg =
  "Привіт! Я бот для організації подій спільноти! 🎉\n\n" +
  "Використовуй ці команди для взаємодії:\n" +
  commandsMsg;

const errorMsg = "Нажаль, сталась помилка. Спробуйте пізніше.";

const dateFormatMsg = "<b>25 жовтня 18:00</b> або <b>25.10, 18:00</b>";

module.exports = {
  startMsg,
  commandsMsg,
  errorMsg,
  dateFormatMsg,
};
