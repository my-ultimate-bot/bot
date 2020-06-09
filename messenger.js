const axios = require('axios');

module.exports = async (telegram, telegramUserId) => {
  const message = await axios.get('https://raw.githubusercontent.com/my-ultimate-bot/bot/master/message.txt');
  const trimmedMessage = message.data.trim();
  if (trimmedMessage !== '') {
    telegram.sendMessage(telegramUserId, trimmedMessage);
  }
};
