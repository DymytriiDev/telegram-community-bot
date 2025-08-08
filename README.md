# Telegram Community Event Bot

A Node.js Telegram bot for managing community events in a group chat. This bot allows users to create events, view upcoming and past events, and see a leaderboard of top event creators.

## Features

- **Event Creation**: Step-by-step wizard to create new events
- **Admin Approval**: Events require admin approval before being posted
- **Event Listing**: View upcoming and past events
- **Leaderboard**: Track top event creators in your community
- **Topic Support**: Post events to specific topics in your group

## Prerequisites

- Node.js (v14 or higher)
- MongoDB database (free tier on MongoDB Atlas works well)
- Telegram Bot Token (from BotFather)
- A Telegram group where the bot is an admin

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your environment variables by editing the `.env` file:
   ```
   BOT_TOKEN=your_bot_token_here
   MONGODB_URI=your_mongodb_connection_string
   ADMIN_USER_ID=your_telegram_id
   GROUP_CHAT_ID=your_group_chat_id
   TOPIC_ID=your_topic_id (optional)
   ```

### Getting Required IDs

- **Bot Token**: Talk to [@BotFather](https://t.me/botfather) on Telegram to create a new bot and get a token
- **Admin User ID**: Send a message to [@userinfobot](https://t.me/userinfobot) to get your Telegram user ID
- **Group Chat ID**: Add [@RawDataBot](https://t.me/RawDataBot) to your group temporarily, it will show the chat ID
- **Topic ID**: If using topics, this is the message thread ID of your topic

## Running the Bot

Start the bot with:

```
node index.js
```

For production, consider using a process manager like PM2:

```
npm install -g pm2
pm2 start index.js --name telegram-event-bot
```

## Bot Commands

- `/start` - Introduction to the bot
- `/help` - Show available commands
- `/create` - Start the event creation wizard
- `/events` - List upcoming events
- `/past` - Show past events
- `/leaderboard` - View top event creators

## Event Creation Flow

1. User initiates with `/create` command
2. Bot asks for event title (What?)
3. Bot asks for event date and time (When?)
4. Bot asks for event location (Where?)
5. Bot shows a preview and asks for confirmation
6. Event is sent to admin for approval
7. If approved, event is posted to the group

## Development

The project structure is organized as follows:

```
telegram-community-bot/
├── index.js               # Entry point
├── .env                   # Environment variables
├── src/
│   ├── bot.js            # Main bot setup
│   ├── db/
│   │   └── connection.js # Database connection
│   ├── models/
│   │   ├── event.js      # Event model
│   │   └── user.js       # User model
│   ├── scenes/
│   │   └── createEvent.js # Event creation wizard
│   ├── handlers/
│   │   └── adminHandlers.js # Admin approval handlers
│   └── utils/
│       └── formatters.js  # Message formatting utilities
└── package.json
```

## License

MIT
