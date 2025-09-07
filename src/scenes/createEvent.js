const { Scenes, Markup } = require("telegraf");
const { message } = require("telegraf/filters");
const moment = require("moment");

const { createEvent } = require("../models/event");
const { getOrCreateUser, incrementUserEventCount } = require("../models/user");
const { formatEvent } = require("../utils/formatters");
const fetchDateTime = require("../utils/fetchDateTime");
const { startMsg, dateFormatMsg } = require("../message_templates.js");

// Create a scene for event creation
const createEventScene = new Scenes.WizardScene(
  "create-event",
  // Step 1: Ask for event title (what)
  async (ctx) => {
    await ctx.reply("Що організовуємо? Введи назву події.", {
      parse_mode: "HTML",
    });
    ctx.wizard.state.eventData = {};
    return ctx.wizard.next();
  },

  // Step 2: Receive title and ask for date (when)
  async (ctx) => {
    // Check for restart command
    if (
      ctx.message &&
      ctx.message.text &&
      ctx.message.text.startsWith("/restart")
    ) {
      await ctx.scene.leave();
      await ctx.reply(startMsg);
      return;
    }

    // Check if we have text
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply("Потрібна назва події!");
      return;
    }

    // Save the title
    ctx.wizard.state.eventData.title = ctx.message.text;

    await ctx.reply(
      "Супер! Коли?\n\n" + "Введи дату та час, наприклад:\n" + dateFormatMsg,
      {
        parse_mode: "HTML",
      }
    );
    return ctx.wizard.next();
  },

  // Step 3: Receive date and ask for location (where)
  async (ctx) => {
    // Check for restart command
    if (
      ctx.message &&
      ctx.message.text &&
      ctx.message.text.startsWith("/restart")
    ) {
      await ctx.scene.leave();
      await ctx.reply(startMsg);
      return;
    }

    // Check if we have text
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply("Введи дату та час у форматі: " + dateFormatMsg, {
        parse_mode: "HTML",
      });
      return;
    }

    // Try to parse the date
    const dateStr = fetchDateTime(ctx.message.text);
    const date = moment(dateStr, "DD.MM.YYYY, HH:mm");

    // Check if the time is specified (contains a comma and time part)
    const hasTimeSpecified =
      dateStr.includes(",") && /\d{2}:\d{2}/.test(dateStr);

    if (!date.isValid() || !hasTimeSpecified) {
      await ctx.reply(
        "Невірний формат дати та часу.\n" +
          "Введи дату та час у форматі: " +
          dateFormatMsg,
        {
          parse_mode: "HTML",
        }
      );
      return;
    }

    // Check if date is at least 30 minutes in the future
    const now = moment();
    const minAllowedTime = now.clone().add(30, "minutes");

    if (date.isBefore(minAllowedTime)) {
      await ctx.reply(
        "Подія має бути запланована щонайменше на 30 хвилин вперед від поточного часу.\n" +
          `Поточний час: ${now.format("DD.MM, HH:mm")}\n` +
          `Мінімально допустимий час: ${minAllowedTime.format("DD.MM, HH:mm")}`
      );
      return;
    }

    // Save the date
    ctx.wizard.state.eventData.date = date.toDate();

    await ctx.reply(
      "Де відбувається?\n\n" + "Напиши адресу, або скинь посилання google maps."
    );
    return ctx.wizard.next();
  },

  // Step 4: Receive location and confirm event details
  async (ctx) => {
    // Check for restart command
    if (
      ctx.message &&
      ctx.message.text &&
      ctx.message.text.startsWith("/restart")
    ) {
      await ctx.scene.leave();
      await ctx.reply(startMsg);
      return;
    }

    // Check if we have location or text
    if (ctx.message.location) {
      // Save location coordinates
      ctx.wizard.state.eventData.location = {
        latitude: ctx.message.location.latitude,
        longitude: ctx.message.location.longitude,
      };
    } else if (ctx.message.text) {
      // Save location as text address
      ctx.wizard.state.eventData.location = {
        address: ctx.message.text,
      };
    } else {
      await ctx.reply(
        "Введи адресу, або скинь посилання google maps, або відправ локацію."
      );
      return;
    }

    await ctx.reply(
      "Додай опис події! Розкажи деталі або зроби цікавий анонс :)"
    );

    return ctx.wizard.next();
  },

  // Step 5: Handle confirmation
  async (ctx) => {
    // Check for restart command
    if (
      ctx.message &&
      ctx.message.text &&
      ctx.message.text.startsWith("/restart")
    ) {
      await ctx.scene.leave();
      await ctx.reply(startMsg);
      return;
    }
    // Check if we have text for description
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply("Потрібен опис події – будь ласка, додай опис.", {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          Markup.button.callback("🔄 Почати спочатку", "restart_creation"),
        ]),
      });
      return;
    }

    // Save description
    ctx.wizard.state.eventData.description = ctx.message.text;

    // Get user info for creator
    const user = ctx.from;
    ctx.wizard.state.eventData.creator = {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
    };

    // Set initial approval status
    ctx.wizard.state.eventData.approved = false;

    // Format the event for confirmation
    const eventPreview = formatEvent(ctx.wizard.state.eventData);

    await ctx.reply("Все вірно?\n\n" + eventPreview, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        Markup.button.callback("✅ Так!", "confirm_event"),
        Markup.button.callback("❌ Скасувати", "cancel_event"),
      ]),
    });

    return ctx.wizard.next();
  },

  // Step 5: Handle confirmation and submit for approval
  async (ctx) => {
    // This step only handles action callbacks
    return;
  }
);

// Handle event confirmation
createEventScene.action("confirm_event", async (ctx) => {
  try {
    // First, edit the message to remove the inline keyboard
    await ctx.editMessageText(ctx.callbackQuery.message.text, {
      parse_mode: "HTML",
    });

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
        "Нова подія на розгляд:\n\n" +
          formatEvent(savedEvent) +
          "\n\n" +
          "Апрув?",
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            Markup.button.callback(
              `✅ Підтвердити`,
              `approve_${savedEvent._id}`
            ),
            Markup.button.callback(`❌ Відхилити`, `decline_${savedEvent._id}`),
          ]),
        }
      );

      await ctx.answerCbQuery();
      await ctx.reply(
        "Твоя подія створена і відправлена на підтвердження адмінам! 🎉\n" +
          "Вона опублікується в каналі, коли буде підтверджена.",
        Markup.removeKeyboard()
      );
    } else {
      console.warn(
        "Admin user ID not configured. Event approval will be skipped."
      );
      await ctx.answerCbQuery();
      await ctx.reply(
        "Нова подія! 🎉\n" + "Note: Admin approval is not configured.",
        Markup.removeKeyboard()
      );
    }

    return ctx.scene.leave();
  } catch (error) {
    console.error("Error creating event:", error);
    await ctx.answerCbQuery("Помилка створення події");
    await ctx.reply(
      "Помилка створення події. Спробуйте ще раз пізніше.",
      Markup.inlineKeyboard([
        Markup.button.callback("або 🔄 Почати спочатку", "restart_creation"),
      ])
    );
    return ctx.scene.leave();
  }
});

// Handle event cancellation
createEventScene.action("cancel_event", async (ctx) => {
  // First, edit the message to remove the inline keyboard
  await ctx.editMessageText(ctx.callbackQuery.message.text, {
    parse_mode: "HTML",
  });

  await ctx.answerCbQuery("Подія скасована");
  await ctx.reply("Подія скасована.", Markup.removeKeyboard());
  return ctx.scene.leave();
});

// Handle any text input in the confirmation step
createEventScene.on("text", async (ctx, next) => {
  const step = ctx.wizard.cursor;

  // If we're at the confirmation step, remind to use buttons
  if (step === 5) {
    await ctx.reply(
      "Ви можете підтвердити або скасувати подію тільки за допомогою кнопок.",
      Markup.inlineKeyboard([
        Markup.button.callback("✅ Підтвердити", "confirm_event"),
        Markup.button.callback("❌ Скасувати", "cancel_event"),
        Markup.button.callback("або.. 🔄 Почати спочатку", "restart_creation"),
      ])
    );
    return;
  }

  return next();
});

// Handle restart action
createEventScene.action("restart_creation", async (ctx) => {
  // First, edit the message to remove the inline keyboard
  try {
    await ctx.editMessageText(ctx.callbackQuery.message.text, {
      parse_mode: "HTML",
    });
  } catch (error) {
    // Ignore errors if message can't be edited (e.g., too old)
    console.log("Could not edit message:", error.message);
  }

  await ctx.answerCbQuery("Починаємо спочатку");
  await ctx.reply("Давай створимо нову подію! 🎉\n\nЩо організовуємо?");
  ctx.wizard.state.eventData = {};
  ctx.wizard.selectStep(1);
  return;
});

module.exports = {
  createEventScene,
};
