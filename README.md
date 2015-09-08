# node-telegram-bot-api
An API for easily setting up a telegram messenger bot in NodeJS.

## How to use?
```
var tbl = require('../TelegramBotLib'); // Location of the file
var telegram = new tbl.TelegramBotLib({"botToken": telegramToken}); // insert telegram messenger bot token here

// To execute a call to the API use the name of the API call and add a data object
telegram.apiCall(
    'sendMessage' // API to call
    , { // Required data object
        "chatId": 1234
        , "encodedMessage": "Hello, how are you?"
    }
);

// To get output from your bot, you register callbacks, these callbacks are the instructions sent like "/start"
telegram.on('start', startCall); // Start/help/settings are suggested by telegram messenger to always have for your bot
telegram.on('help', helpCall); 
telegram.on('settings', settingsCall);
telegram.on('default', defaultCall);  // This one is unique to this library as this will take any not registered calls,
// as well as any generic messages (if privacy mode is off on the bot)
```

Link to telegram messenger bot API reference: https://core.telegram.org/bots/api

Currently this code only supports polling telegram messenger for bot messages, but now that telegram messenger API supports self signed certificates, this will be implemented.