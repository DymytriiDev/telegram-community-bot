const { Telegraf, Scenes, session } = require("telegraf");
const { message } = require("telegraf/filters");
require("dotenv").config();

const { connectToDatabase } = require("./db/connection");
const { createEventScene } = require("./scenes/createEvent");
const { getUpcomingEvents } = require("./models/event");
const { getPastEvents } = require("./models/event");
const { getLeaderboard } = require("./models/user");
const { formatEvent } = require("./utils/formatters");
const { setupAdminHandlers } = require("./handlers/adminHandlers");
const { isGroupMember } = require("./utils/validators");
const { startMsg } = require("./message_templates.js");

// Initialize bot with token from .env
const bot = new Telegraf(process.env.BOT_TOKEN);

// Set up scene management
const stage = new Scenes.Stage([createEventScene]);
bot.use(session());
bot.use(stage.middleware());

// Connect to database when bot starts
bot.use(async (ctx, next) => {
  if (!ctx.db) {
    ctx.db = await connectToDatabase();
  }
  return next();
});

// Start command - resets any active scene and shows welcome message
bot.command("start", async (ctx) => {
  // Leave any active scene
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }

  await ctx.reply(startMsg);
});

// Restart command - resets any active scene
bot.command("restart", async (ctx) => {
  // Leave any active scene
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }

  await ctx.reply(
    "Всі активні діалоги скинуто. Що бажаєш зробити далі?\n\n" +
      "/create - Створити нову подію\n" +
      "/events - Переглянути майбутні події\n" +
      "/past - Переглянути минулі події\n" +
      "/leaderboard - Переглянути топ організаторів"
  );
});

// Help command
bot.command("help", async (ctx) => {
  // Leave any active scene
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }

  await ctx.reply(
    "Довідка бота подій спільноти 🤖\n\n" +
      "Доступні команди:\n" +
      "/create - Створити нову подію\n" +
      "/events - Переглянути майбутні події\n" +
      "/past - Переглянути минулі події\n" +
      "/leaderboard - Переглянути топ організаторів\n" +
      "/restart - Перезапустити бота (якщо щось не так)\n" +
      "/help - Показати цю довідку"
  );
});

// Create event command - enters the create event scene
bot.command("create", isGroupMember, async (ctx) => {
  // Leave any active scene first
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }
  return ctx.scene.enter("create-event");
});

// Events command - shows upcoming events
bot.command("events", isGroupMember, async (ctx) => {
  // Leave any active scene first
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }

  try {
    const events = await getUpcomingEvents();

    if (events.length === 0) {
      return ctx.reply("Немає майбутніх подій. Створи нову з /create!");
    }

    await ctx.reply(`Знайдено ${events.length} майбутніх подій:`);

    // Send each event as a separate message
    for (const event of events) {
      await ctx.reply(formatEvent(event), { parse_mode: "HTML" });
    }
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    await ctx.reply(
      "Вибачте, сталася помилка при отриманні подій. Спробуйте пізніше."
    );
  }
});

// Past events command - shows archived events
bot.command("past", isGroupMember, async (ctx) => {
  // Leave any active scene first
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }

  try {
    const events = await getPastEvents();

    if (events.length === 0) {
      return ctx.reply("Немає минулих подій.");
    }

    await ctx.reply(`Знайдено ${events.length} минулих подій:`);

    // Send each event as a separate message
    for (const event of events) {
      await ctx.reply(formatEvent(event), { parse_mode: "HTML" });
    }
  } catch (error) {
    console.error("Error fetching past events:", error);
    await ctx.reply(
      "Вибачте, сталася помилка при отриманні минулих подій. Спробуйте пізніше."
    );
  }
});

// Leaderboard command - shows top event creators
bot.command("leaderboard", isGroupMember, async (ctx) => {
  // Leave any active scene first
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }

  try {
    const leaders = await getLeaderboard();

    if (leaders.length === 0) {
      return ctx.reply("Ще не створено жодної події.");
    }

    let message = "🏆 Топ організаторів подій 🏆\n\n";

    leaders.forEach((user, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
      const name = user.firstName || user.username || "Анонім";
      message += `${medal} ${index + 1}. ${name}: ${
        user.eventsApproved
      } Подій\n`;
    });

    await ctx.reply(message);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    await ctx.reply(
      "Вибачте, сталася помилка при отриманні топу організаторів. Спробуйте пізніше."
    );
  }
});

// Set up admin handlers for event approval/decline
setupAdminHandlers(bot);

// Handle errors
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply("Oops! Something went wrong. Please try again later.");
});

module.exports = bot;
