const { Scenes, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const moment = require('moment');

const { createEvent } = require('../models/event');
const { getOrCreateUser, incrementUserEventCount } = require('../models/user');
const { formatEvent } = require('../utils/formatters');

// Create a scene for event creation
const createEventScene = new Scenes.WizardScene(
  'create-event',
  // Step 1: Ask for event title (what)
  async (ctx) => {
    await ctx.reply(
      'Let\'s create a new event! 🎉\n\n' +
      'First, what is the event title?'
    );
    ctx.wizard.state.eventData = {};
    return ctx.wizard.next();
  },
  
  // Step 2: Receive title and ask for date (when)
  async (ctx) => {
    // Check if we have text
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Please provide a text title for your event.');
      return;
    }
    
    // Save the title
    ctx.wizard.state.eventData.title = ctx.message.text;
    
    await ctx.reply(
      'Great! Now, when is this event happening?\n\n' +
      'Please provide the date and time in format: YYYY-MM-DD HH:MM\n' +
      'For example: 2025-08-15 18:30'
    );
    return ctx.wizard.next();
  },
  
  // Step 3: Receive date and ask for location (where)
  async (ctx) => {
    // Check if we have text
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Please provide a date in the format YYYY-MM-DD HH:MM');
      return;
    }
    
    // Try to parse the date
    const dateStr = ctx.message.text;
    const date = moment(dateStr, 'YYYY-MM-DD HH:mm');
    
    if (!date.isValid()) {
      await ctx.reply(
        'Sorry, I couldn\'t understand that date format.\n' +
        'Please use the format YYYY-MM-DD HH:MM (e.g., 2025-08-15 18:30)'
      );
      return;
    }
    
    // Save the date
    ctx.wizard.state.eventData.date = date.toDate();
    
    await ctx.reply(
      'Now, where is this event happening?\n\n' +
      'Please send a location or type an address.',
      Markup.keyboard([
        Markup.button.locationRequest('📍 Send Location')
      ]).oneTime().resize()
    );
    return ctx.wizard.next();
  },
  
  // Step 4: Receive location and confirm event details
  async (ctx) => {
    // Check if we have location or text
    if (ctx.message.location) {
      // Save location coordinates
      ctx.wizard.state.eventData.location = {
        latitude: ctx.message.location.latitude,
        longitude: ctx.message.location.longitude
      };
    } else if (ctx.message.text) {
      // Save location as text address
      ctx.wizard.state.eventData.location = {
        address: ctx.message.text
      };
    } else {
      await ctx.reply('Please send a location or type an address.');
      return;
    }
    
    // Save creator information
    const user = ctx.message.from;
    ctx.wizard.state.eventData.creator = {
      id: user.id,
      username: user.username,
      firstName: user.first_name
    };
    
    // Set initial approval status
    ctx.wizard.state.eventData.approved = false;
    
    // Format the event for confirmation
    const eventPreview = formatEvent(ctx.wizard.state.eventData);
    
    await ctx.reply(
      'Here\'s a preview of your event:\n\n' + 
      eventPreview + '\n\n' +
      'Does this look correct?',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          Markup.button.callback('✅ Confirm', 'confirm_event'),
          Markup.button.callback('❌ Cancel', 'cancel_event')
        ])
      }
    );
    
    return ctx.wizard.next();
  },
  
  // Step 5: Handle confirmation and submit for approval
  async (ctx) => {
    // This step only handles action callbacks
    return;
  }
);

// Handle event confirmation
createEventScene.action('confirm_event', async (ctx) => {
  try {
    // Store event in database
    const eventData = ctx.wizard.state.eventData;
    const savedEvent = await createEvent(eventData);
    
    // Update user stats
    await getOrCreateUser(eventData.creator);
    await incrementUserEventCount(eventData.creator.id);
    
    // Send to admin for approval
    const adminId = process.env.ADMIN_USER_ID;
    
    if (adminId) {
      await ctx.telegram.sendMessage(
        adminId,
        'New event submission for approval:\n\n' +
        formatEvent(savedEvent) + '\n\n' +
        'Do you want to approve this event?',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            Markup.button.callback(`✅ Approve`, `approve_${savedEvent._id}`),
            Markup.button.callback(`❌ Decline`, `decline_${savedEvent._id}`)
          ])
        }
      );
      
      await ctx.answerCbQuery();
      await ctx.reply(
        'Your event has been submitted for approval! 🎉\n' +
        'You\'ll be notified when it\'s approved.',
        Markup.removeKeyboard()
      );
    } else {
      console.warn('Admin user ID not configured. Event approval will be skipped.');
      await ctx.answerCbQuery();
      await ctx.reply(
        'Your event has been created! 🎉\n' +
        'Note: Admin approval is not configured.',
        Markup.removeKeyboard()
      );
    }
    
    return ctx.scene.leave();
  } catch (error) {
    console.error('Error creating event:', error);
    await ctx.answerCbQuery('Error creating event');
    await ctx.reply(
      'Sorry, there was an error creating your event. Please try again later.',
      Markup.removeKeyboard()
    );
    return ctx.scene.leave();
  }
});

// Handle event cancellation
createEventScene.action('cancel_event', async (ctx) => {
  await ctx.answerCbQuery('Event creation cancelled');
  await ctx.reply('Event creation cancelled.', Markup.removeKeyboard());
  return ctx.scene.leave();
});

// Handle any text input in the confirmation step
createEventScene.on('text', async (ctx, next) => {
  const step = ctx.wizard.cursor;
  
  // If we're at the confirmation step, remind to use buttons
  if (step === 4) {
    await ctx.reply(
      'Please use the buttons to confirm or cancel the event.',
      Markup.inlineKeyboard([
        Markup.button.callback('✅ Confirm', 'confirm_event'),
        Markup.button.callback('❌ Cancel', 'cancel_event')
      ])
    );
    return;
  }
  
  return next();
});

module.exports = {
  createEventScene
};
