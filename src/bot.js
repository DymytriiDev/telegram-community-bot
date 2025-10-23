const { Telegraf, Scenes, session } = require("telegraf");
require("dotenv").config();

const { connectToDatabase } = require("./db/connection");
const { createEventScene } = require("./scenes/createEvent");
const { getLeaderboard } = require("./models/user");
const { setupAdminHandlers } = require("./handlers/adminHandlers");
const { isGroupMember } = require("./utils/validators");
const { startMsg, commandsMsg, errorMsg } = require("./message_templates.js");

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
    "Всі активні діалоги скинуто. Що робимо далі?\n\n" + commandsMsg
  );
});

// Help command
bot.command("help", async (ctx) => {
  // Leave any active scene
  if (ctx.scene.current) {
    await ctx.scene.leave();
  }

  await ctx.reply(
    "Довідка бота подій спільноти 🤖\n\n" + "Доступні команди:\n" + commandsMsg
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

  return ctx.reply(
    "Голосуй в гілці «Події» в нашому чаті 🐸, щоб приєднатися до актуальних подій"
  );
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

    let message = "Улюблені Frogga 🐸\n";

    leaders.forEach((user, index) => {
      const medal =
        index === 0 ? "🥇 " : index === 1 ? "🥈 " : index === 2 ? "🥉 " : "";
      const name = user.firstName || user.username || "Анонім";
      message += `${medal}${name} - ${user.eventsApproved} Події\n`;
    });

    await ctx.reply(message);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    await ctx.reply(errorMsg);
  }
});

// Set up admin handlers for event approval/decline
setupAdminHandlers(bot);

// Handle errors
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply(errorMsg);
});

module.exports = bot;
