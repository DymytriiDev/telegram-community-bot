const { ObjectId } = require("mongodb");
const { getEventById, updateEvent } = require("../models/event");
const { incrementUserEventCount } = require("../models/user");
const { formatEvent } = require("../utils/formatters");

/**
 * Handle event approval
 * @param {Object} bot - Telegraf bot instance
 */
function setupAdminHandlers(bot) {
  // Handle event approval
  bot.action(/approve_(.+)/, async (ctx) => {
    try {
      const eventId = ctx.match[1];

      // Get the event from database
      const event = await getEventById(new ObjectId(eventId));

      if (!event) {
        await ctx.answerCbQuery("Event not found");
        await ctx.editMessageText("Event not found or already processed.");
        return;
      }

      // Mark event as approved
      const updatedEvent = await updateEvent(event._id, { approved: true });

      // Increment user's approved events count
      await incrementUserEventCount(event.creator.id, true);

      // Post to group chat
      const groupChatId = process.env.GROUP_CHAT_ID;
      const topicId = process.env.TOPIC_ID;

      if (!groupChatId) {
        await ctx.answerCbQuery("Group chat ID not configured");
        await ctx.editMessageText(
          "Event approved, but group chat ID is not configured.\n\n" +
            formatEvent(updatedEvent),
          { parse_mode: "HTML" }
        );
        return;
      }

      // Send message to group chat
      const messageOptions = { parse_mode: "HTML" };

      // Add message thread if topic ID is provided
      if (topicId) {
        messageOptions.message_thread_id = topicId;
      }

      // First, send the event message
      const sentMessage = await ctx.telegram.sendMessage(
        groupChatId,
        formatEvent(updatedEvent),
        messageOptions
      );

      // Then, send a poll asking if people will attend
      const pollOptions = { is_anonymous: false };

      // Add message thread if topic ID is provided
      if (topicId) {
        pollOptions.message_thread_id = topicId;
      }

      await ctx.telegram.sendPoll(
        groupChatId,
        `Будеш на ${updatedEvent.title}?`,
        ["Так! ✅", "Можливо 🤔"],
        pollOptions
      );

      // Store message ID for reference
      await updateEvent(event._id, { messageId: sentMessage.message_id });

      // Notify admin of successful approval
      await ctx.answerCbQuery("Подія підтверджена!");
      await ctx.editMessageText(
        "✅ Подія підтверджена і опублікована в групі!\n\n" +
          formatEvent(updatedEvent),
        { parse_mode: "HTML" }
      );

      // Notify the event creator
      await ctx.telegram.sendMessage(
        event.creator.id,
        "🎉 Твоя подія підтверджена і опублікована в групі!\n\n" +
          formatEvent(updatedEvent),
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("Error approving event:", error);
      await ctx.answerCbQuery("Error approving event");
      await ctx.reply("Sorry, there was an error approving the event.");
    }
  });

  // Handle event decline
  bot.action(/decline_(.+)/, async (ctx) => {
    try {
      const eventId = ctx.match[1];

      // Get the event from database
      const event = await getEventById(new ObjectId(eventId));

      if (!event) {
        await ctx.answerCbQuery("Event not found");
        await ctx.editMessageText("Event not found or already processed.");
        return;
      }

      // Mark event as declined
      await updateEvent(event._id, { approved: false, declined: true });

      // Notify admin of successful decline
      await ctx.answerCbQuery("Event declined");
      await ctx.editMessageText("❌ Event declined:\n\n" + formatEvent(event), {
        parse_mode: "HTML",
      });

      // Notify the event creator
      await ctx.telegram.sendMessage(
        event.creator.id,
        "❌ Нажаль, твоя подія не була підтверджена.\n\n" +
          formatEvent(event) +
          "\n\n" +
          "Ти можеш створити нову подію знову, використовуючи команду /create.",
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("Error declining event:", error);
      await ctx.answerCbQuery("Error declining event");
      await ctx.reply("Sorry, there was an error declining the event.");
    }
  });
}

module.exports = {
  setupAdminHandlers,
};
