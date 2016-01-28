"use strict";
/*let BotApi = new (require('./lib/telegrambotapi').BotApi)({"botToken": "1122"});
let BotManager = new (require('./lib/telegrambotmanager').BotManager)({"botToken": "1122"});*/
//mainlet botData = {};
//let main = {};

class BotManager {
  constructor(settings) {
    //main = this;
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
    setInterval(() => {this.watchUpdates();}, this.options.updateTime);
    this.watchUpdates();

    return false;
  }
  watchUpdates() {
    console.log('garble');
    this.apiCall('getUpdates', {"offset": this.data.updateCount});

    return false;
  }
  apiCall(call, data) {
    let apiCalls = this.options.apiCalls;
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
      this.https.get(this.options.baseUrl + apiToCall, this.apiReturn).on('error', function(e) {
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
              if(this.data.updateCount <= result.update_id) {
                this.data.updateCount = result.update_id + 1;
              }
              // Stores individual chats
              if(result.hasOwnProperty('message') && !this.data.users.hasOwnProperty(result.message.chat.id)) {
                this.data.users[result.message.chat.id] = { "name": result.message.chat.username};
              };
              // Executes custom function, if found
              if(this.functionReferenceStore.hasOwnProperty(functionCall)) {
                this.functionReferenceStore[functionCall](result);
              }
              else if(this.data.users[result.message.chat.id].hasOwnProperty('deferredAction')) {
                this.data.users[result.message.chat.id]['deferredAction'](result);
                delete this.data.users[result.message.chat.id]['deferredAction'];
              }
              else if(this.functionReferenceStore.hasOwnProperty('default')) {
                this.functionReferenceStore['default'](result);
              };
            };
          };
        };
      };
    });
    return false;
  }
  on(functionName, functionReference) {
    this.functionReferenceStore[functionName] = functionReference;

    return false;
  }
  deferAction(chatId, action) {
    if(typeof(chatId) === 'number' && typeof(action) === 'function') {
      this.data.users[chatId]['deferredAction'] = action;
    };
    return false;
  }
  deferActionRemove(chatId) {
    if(typeof(chatId) === 'number') {
      delete this.data.users[chatId]['deferredAction'];
    };
    return false;
  }
}
exports.BotManager = BotManager;
