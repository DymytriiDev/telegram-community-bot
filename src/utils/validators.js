/**
 * User validation utilities
 */

/**
 * Middleware to check if a user is a member of the group
 * @param {Object} ctx - Telegram context
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
async function isGroupMember(ctx, next) {
  try {
    const groupChatId = process.env.GROUP_CHAT_ID;
    
    if (!groupChatId) {
      console.warn("GROUP_CHAT_ID not configured in environment variables");
      return next(); // Allow access if group ID is not configured
    }
    
    const userId = ctx.from.id;
    
    // Try to get user's status in the group
    try {
      const chatMember = await ctx.telegram.getChatMember(groupChatId, userId);
      
      // Check if user is a member of the group
      const validStatuses = ["creator", "administrator", "member", "restricted"];
      if (validStatuses.includes(chatMember.status)) {
        return next(); // User is a member, allow access
      }
      
      // User is not a member (left or kicked)
      await ctx.reply(
        "Щоб користуватися ботом, ти маєш бути учасником нашої групи.\n\n" +
        "Для отримання доступу, зв'яжись з @vckpn або @amidnew."
      );
      return;
    } catch (error) {
      console.error("Error checking group membership:", error);
      
      // If we can't check membership, inform the user
      await ctx.reply(
        "Не вдалося перевірити твоє членство в групі.\n\n" +
        "Для отримання доступу, зв'яжись з @vckpn або @amidnew."
      );
      return;
    }
  } catch (error) {
    console.error("Error in isGroupMember middleware:", error);
    return next(); // Allow access on error to prevent bot from breaking
  }
}

module.exports = {
  isGroupMember
};
