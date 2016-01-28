"use strict";
/*let BotApi = new (require('./lib/telegrambotapi').BotApi)({"botToken": "1122"});
let BotManager = new (require('./lib/telegrambotmanager').BotManager)({"botToken": "1122"});*/
//mainlet botData = {};
let main = {};

class BotManager {
  var main = {};
  constructor(settings) {
    main = this;
    this.data = {
      "updateCount": 0
      , "users": {
      }
    };
    this.options = {
      "baseUrl": "https://api.telegram.org/bot"
      , "updateTime": 3000
      , "apiCalls": {
        "sendMessage": "sendMessage?chat_id=${chatId}&text=${encodedMessage}"
        , "getUpdates": "getUpdates?offset=${offset}"
      }
    };

    this.https = require('https');

    this.options.baseUrl += settings.botToken + '/';
    setInterval(this.watchUpdates, main.options.updateTime);
    this.watchUpdates();

    return false;
  }
  watchUpdates() {
    console.log('garble');
    main.apiCall('getUpdates', {"offset": main.data.updateCount});

    return false;
  }
  apiCall(call, data) {
    let apiCalls = main.options.apiCalls;
    let apiToCall = '';
    if(apiCalls.hasOwnProperty(call)) {
      // Replace placeholder with values from data object
      apiToCall = apiCalls[call].replace(
        /\${([a-z]+)}/gim
        , function(replacement) {
          let replaced = '';
          replacement = replacement.substr(2, (replacement.length -3));

          if(data.hasOwnProperty(replacement)) {
            replaced = encodeURIComponent(data[replacement]);
          };

          return replaced;
        }
      );

      // Call the API
      this.https.get(main.options.baseUrl + apiToCall, this.apiReturn).on('error', function(e) {
        console.error(e);
      });
    };
    return false;
  }
  apiReturn(resource) {
    let dataCount = 0;
    let fullData = '';
    let dataLength = parseInt(resource.headers['content-length']);

    resource.on('data', function(data) {
      if(dataCount !== dataLength) {
          fullData += data;
          dataCount += data.length;
      };
      if(dataCount === dataLength) {
        let jsonData = {};
        try {
            jsonData = JSON.parse(fullData);
        }
        catch(error) {
            console.log(error);
        };

        // Checks if the API call was a success
        if(jsonData.hasOwnProperty('ok') && jsonData.ok && jsonData.result.hasOwnProperty('length')) {
          let resultLength = jsonData.result.length
          for(let i = 0; i < resultLength; i += 1) {
            let result = jsonData.result[i];
            // Log all results
            console.log(result.message.chat.id, result.message.text);
            if(result.message.text !== undefined) {
              let functionCall = result.message.text;
              functionCall = (functionCall.indexOf('/') === 0 ? functionCall.substr(1) : '');
              functionCall = (functionCall.indexOf('@') >= 0 ? functionCall.substr(0, functionCall.indexOf('@')) : functionCall);

              // Stores the next update_id
              if(main.data.updateCount <= result.update_id) {
                main.data.updateCount = result.update_id + 1;
              }
              // Stores individual chats
              if(result.hasOwnProperty('message') && !main.data.users.hasOwnProperty(result.message.chat.id)) {
                main.data.users[result.message.chat.id] = { "name": result.message.chat.username};
              };
              // Executes custom function, if found
              if(main.functionReferenceStore.hasOwnProperty(functionCall)) {
                main.functionReferenceStore[functionCall](result);
              }
              else if(main.data.users[result.message.chat.id].hasOwnProperty('deferredAction')) {
                main.data.users[result.message.chat.id]['deferredAction'](result);
                delete main.data.users[result.message.chat.id]['deferredAction'];
              }
              else if(main.functionReferenceStore.hasOwnProperty('default')) {
                main.functionReferenceStore['default'](result);
              };
            };
          };
        };
      };
    });
    return false;
  }
  on(functionName, functionReference) {
    main.functionReferenceStore[functionName] = functionReference;

    return false;
  }
  deferAction(chatId, action) {
    if(typeof(chatId) === 'number' && typeof(action) === 'function') {
      main.data.users[chatId]['deferredAction'] = action;
    };
    return false;
  }
  deferActionRemove(chatId) {
    if(typeof(chatId) === 'number') {
      delete main.data.users[chatId]['deferredAction'];
    };
    return false;
  }
}
exports.BotManager = BotManager;
