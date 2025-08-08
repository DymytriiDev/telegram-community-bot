const { Telegraf, Scenes, session } = require('telegraf');
const { message } = require('telegraf/filters');
require('dotenv').config();

const { connectToDatabase } = require('./db/connection');
const { createEventScene } = require('./scenes/createEvent');
const { getUpcomingEvents } = require('./models/event');
const { getPastEvents } = require('./models/event');
const { getLeaderboard } = require('./models/user');
const { formatEvent } = require('./utils/formatters');
const { setupAdminHandlers } = require('./handlers/adminHandlers');

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

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Welcome to the Community Event Bot! 🎉\n\n' +
    'Use these commands to interact with me:\n' +
    '/create - Create a new event\n' +
    '/events - View upcoming events\n' +
    '/past - View past events\n' +
    '/leaderboard - See who creates the most events'
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    'Community Event Bot Help 🤖\n\n' +
    'Available commands:\n' +
    '/create - Start the event creation process\n' +
    '/events - List all upcoming events\n' +
    '/past - Show past events\n' +
    '/leaderboard - View top event creators\n' +
    '/help - Show this help message'
  );
});

// Create event command - enters the create event scene
bot.command('create', (ctx) => ctx.scene.enter('create-event'));

// Events command - shows upcoming events
bot.command('events', async (ctx) => {
  try {
    const events = await getUpcomingEvents();
    
    if (events.length === 0) {
      return ctx.reply('No upcoming events found. Create one with /create!');
    }
    
    await ctx.reply(`Found ${events.length} upcoming events:`);
    
    // Send each event as a separate message
    for (const event of events) {
      await ctx.reply(formatEvent(event), { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    await ctx.reply('Sorry, there was an error fetching the events. Please try again later.');
  }
});

// Past events command - shows archived events
bot.command('past', async (ctx) => {
  try {
    const events = await getPastEvents();
    
    if (events.length === 0) {
      return ctx.reply('No past events found.');
    }
    
    await ctx.reply(`Found ${events.length} past events:`);
    
    // Send each event as a separate message
    for (const event of events) {
      await ctx.reply(formatEvent(event), { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('Error fetching past events:', error);
    await ctx.reply('Sorry, there was an error fetching past events. Please try again later.');
  }
});

// Leaderboard command - shows top event creators
bot.command('leaderboard', async (ctx) => {
  try {
    const users = await getLeaderboard(10);
    
    if (users.length === 0) {
      return ctx.reply('No events have been created yet. Be the first with /create!');
    }
    
    let message = '🏆 <b>Event Creator Leaderboard</b> 🏆\n\n';
    
    users.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const name = user.firstName || user.username || 'Anonymous';
      message += `${medal} ${name}: ${user.eventsApproved} approved events\n`;
    });
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    await ctx.reply('Sorry, there was an error fetching the leaderboard. Please try again later.');
  }
});

// Set up admin handlers for event approval/decline
setupAdminHandlers(bot);

// Handle errors
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('Oops! Something went wrong. Please try again later.');
});

module.exports = bot;
