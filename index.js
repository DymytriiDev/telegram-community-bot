const bot = require('./src/bot');
const { connectToDatabase, closeDatabaseConnection } = require('./src/db/connection');

// Connect to database
connectToDatabase()
  .then(() => {
    console.log('Starting bot...');
    
    // Start the bot
    bot.launch()
      .then(() => {
        console.log('Bot started successfully!');
      })
      .catch((error) => {
        console.error('Error starting bot:', error);
        process.exit(1);
      });
    
    // Enable graceful stop
    process.once('SIGINT', () => {
      bot.stop('SIGINT');
      closeDatabaseConnection();
    });
    
    process.once('SIGTERM', () => {
      bot.stop('SIGTERM');
      closeDatabaseConnection();
    });
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  });
