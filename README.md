# node-telegram-bot-manager
An API/manager for easily setting up a telegram messenger bot in NodeJS.

## How to use?
```javascript
// Using it with a 3 second polling system
let telegram = new (require('telegram-bot-manager').BotManager)({"botToken": yourBotToken});

// Using webhooks
let telegram = new (require('telegram-bot-manager').BotManager)({
  "botToken": yourBotToken
  , "type": "webhook"
  , "key": yourSslKey
  , "cert": yourSslCertificate
  , "receiver": { // Settings for the webhook endpoint
    "port": incomingWebhookPort // The port it will be running on, make sure you have access to it on your server
    , "protocol": "http" // What protocol will it use, http or https depending on how you want to use it
    , "endpoint": yourBotLocation // The url or ip for where your server is located
  }
});

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