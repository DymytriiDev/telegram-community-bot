const { Scenes, Markup } = require("telegraf");
const { message } = require("telegraf/filters");
const moment = require("moment");

const { createEvent } = require("../models/event");
const { getOrCreateUser, incrementUserEventCount } = require("../models/user");
const { formatEvent } = require("../utils/formatters");

// Create a scene for event creation
const createEventScene = new Scenes.WizardScene(
  "create-event",
  // Step 1: Ask for event title (what)
  async (ctx) => {
    await ctx.reply("Давай створимо нову подію! 🎉\n\n" + "Що організовуємо?");
    ctx.wizard.state.eventData = {};
    return ctx.wizard.next();
  },

  // Step 2: Receive title and ask for date (when)
  async (ctx) => {
    // Check if we have text
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply(
        "Потрібна назва події.",
        Markup.inlineKeyboard([
          Markup.button.callback(
            "або.. 🔄 Почати спочатку",
            "restart_creation"
          ),
        ])
      );
      return;
    }

    // Save the title
    ctx.wizard.state.eventData.title = ctx.message.text;

    await ctx.reply(
      "Супер! Коли?\n\n" +
        "Введи дату та час, наприклад:\n" +
        "<b>15.08.2025, 18:30</b>",
      {
        parse_mode: "HTML",
      }
    );
    return ctx.wizard.next();
  },

  // Step 3: Receive date and ask for location (where)
  async (ctx) => {
    // Check if we have text
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply(
        "Введи дату та час у форматі: DD.MM.YYYY, HH:MM",
        Markup.inlineKeyboard([
          Markup.button.callback(
            "або.. 🔄 Почати спочатку",
            "restart_creation"
          ),
        ])
      );
      return;
    }

    // Try to parse the date
    const dateStr = ctx.message.text;
    const date = moment(dateStr, "DD.MM.YYYY, HH:mm");

    if (!date.isValid()) {
      await ctx.reply(
        "Невірний формат дати та часу.\n" +
          "Введи дату та час у форматі: DD.MM.YYYY, HH:MM\n" +
          "Наприклад: <b>15.08.2025, 18:30</b>",
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            Markup.button.callback(
              "або.. 🔄 Почати спочатку",
              "restart_creation"
            ),
          ]),
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
          `Поточний час: ${now.format("DD.MM.YYYY, HH:mm")}\n` +
          `Мінімально допустимий час: ${minAllowedTime.format(
            "DD.MM.YYYY, HH:mm"
          )}`,
        Markup.inlineKeyboard([
          Markup.button.callback(
            "або.. 🔄 Почати спочатку",
            "restart_creation"
          ),
        ])
      );
      return;
    }

    // Save the date
    ctx.wizard.state.eventData.date = date.toDate();

    await ctx.reply(
      "Де відбувається?\n\n" +
        "Напиши адресу, або скинь посилання google maps, або відправ локацію.",
      Markup.keyboard([Markup.button.locationRequest("📍 Надіслати локацію")])
        .oneTime()
        .resize()
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
        longitude: ctx.message.location.longitude,
      };
    } else if (ctx.message.text) {
      // Save location as text address
      ctx.wizard.state.eventData.location = {
        address: ctx.message.text,
      };
    } else {
      await ctx.reply(
        "Введи адресу, або скинь посилання google maps, або відправ локацію.",
        Markup.inlineKeyboard([
          Markup.button.callback(
            "або.. 🔄 Почати спочатку",
            "restart_creation"
          ),
        ])
      );
      return;
    }

    // Save creator information
    const user = ctx.message.from;
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
        Markup.button.callback("✅ Так, все вірно!", "confirm_event"),
        Markup.button.callback("❌ Ні, скасувати", "cancel_event"),
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
          "Ти отримаєш повідомлення, коли адмін підтвердить подію.",
        Markup.removeKeyboard()
      );
    } else {
      console.warn(
        "Admin user ID not configured. Event approval will be skipped."
      );
      await ctx.answerCbQuery();
      await ctx.reply(
        "Your event has been created! 🎉\n" +
          "Note: Admin approval is not configured.",
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
  await ctx.answerCbQuery("Подія скасована");
  await ctx.reply("Подія скасована.", Markup.removeKeyboard());
  return ctx.scene.leave();
});

// Handle any text input in the confirmation step
createEventScene.on("text", async (ctx, next) => {
  const step = ctx.wizard.cursor;

  // If we're at the confirmation step, remind to use buttons
  if (step === 4) {
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
  await ctx.answerCbQuery("Починаємо спочатку");
  await ctx.reply("Давай створимо нову подію! 🎉\n\nЩо організовуємо?");
  ctx.wizard.state.eventData = {};
  ctx.wizard.selectStep(1);
  return;
});

module.exports = {
  createEventScene,
};
