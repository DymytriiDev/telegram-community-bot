const commandsMsg =
  "/events - Найближчі події\n" +
  "/create - Створи подію\n" +
  "/leaderboard - Улюблені Frogga\n" +
  "/restart - Перезапусти Frogga, якщо щось не так";

const startMsg =
  "Я — Frogg, ти мене вже знаєш. І я вже знаю, що ти шукаєш. Застрибуй в цей потік. \n" +
  "🐸\n\n" +
  commandsMsg;

const errorMsg = "Нажаль, сталась помилка. Спробуйте пізніше.";

const dateFormatMsg = "<b>25 жовтня 18:00</b> або <b>25.10, 18:00</b>";

module.exports = {
  startMsg,
  commandsMsg,
  errorMsg,
  dateFormatMsg,
};
