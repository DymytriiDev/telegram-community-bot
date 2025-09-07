const months = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];

function fetchDateTime(string) {
  let day, month, time;
  const currentYear = new Date().getFullYear();

  // Очищаємо вхідний рядок від зайвих пробілів
  const cleanString = string.trim();

  // Шукаємо час у форматі HH:MM
  const timeMatch = cleanString.match(/\d{1,2}:\d{2}/);
  if (timeMatch) {
    time = timeMatch[0];
  }

  // Варіант 1: формат "25 жовтня 18:00"
  if (months.some((month) => cleanString.includes(month))) {
    // Знаходимо день (число перед назвою місяця)
    const dayMatch = cleanString.match(/\d{1,2}(?=\s+[а-яА-Я]+)/);
    if (dayMatch) {
      day = dayMatch[0].padStart(2, "0");
    }

    // Знаходимо місяць
    for (let i = 0; i < months.length; i++) {
      if (cleanString.includes(months[i])) {
        month = (i + 1).toString().padStart(2, "0");
        break;
      }
    }
  }

  // Варіант 2: формат "25.10, 18:00"
  else if (cleanString.includes(".")) {
    const dateMatch = cleanString.match(/(\d{1,2})\.(\d{1,2})/);
    if (dateMatch) {
      day = dateMatch[1].padStart(2, "0");
      month = dateMatch[2].padStart(2, "0");
    }
  }

  // Якщо вдалося розпізнати дату і час, форматуємо результат
  if (day && month && time) {
    return `${day}.${month}.${currentYear}, ${time}`;
  }

  // Якщо не вдалося розпізнати, повертаємо null
  return null;
}

module.exports = fetchDateTime;
