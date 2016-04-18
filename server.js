"use strict";
class BotManager {
  constructor(settings) {
    this.lib = {};
    this.lib.fs = require('fs');
    this.lib.https = require('https');
    this.lib.multipartGenerate = new (require('multipart-light').generate);
    
    this.data = {
      "updateCount": 0
      , "users": {
      }
    };
    
    this.telegramEnvelope = {
      "update_id": 709352500,
      "message": {
        "message_id": 54,
        "from": {
          "id": 90385038,
          "first_name": "Kris",
          "last_name": "Zane",
          "username": "KrisZane"
        },
        "chat": {
          "id": 90385038,
          "first_name": "Kris",
          "last_name": "Zane",
          "username": "KrisZane",
          "type": "private"
        },
        "date": 1460642885,
        "text": "/settings",
        "entities": [
          {
            "type": "bot_command",
            "offset": 0,
            "length": 9
          }
        ]
      }
    };
    
    this.options = {
      "baseUrl": "https://api.telegram.org/bot" + settings.botToken + '/'
      , "updateTime": 3000
      , "apiCalls": {
        "sendMessage": "sendMessage?chat_id=${chatId}&text=${encodedMessage}"
        , "getUpdates": "getUpdates?offset=${offset}"
        , "setWebhook": "setWebhook"
      }
    };
    if(settings.key !== undefined && settings.cert !== undefined) {
      this.options.key = this.lib.fs.readFileSync(settings.key);
      this.options.cert = this.lib.fs.readFileSync(settings.cert);
    }
    else {
      settings.type = 'poller';
    };
    
    this.functionReferenceStore = {};
    
    if(settings.type === 'webhook') {
      this.createServer();
      this.registerServer();
    }
    else {
      console.log('Polling mode.');
      setInterval(() => {this.watchUpdates();}, this.options.updateTime);
    };
    
    return false;
  }
  createServer() {
    this.lib.https.createServer(this.options, (request, response) => {
      this.apiReturn(request);
      response.writeHead(200);
      response.end("Thank you telegram\n");
    }).listen(8080);
  }
  registerServer() {
    let multipartData = [
      {"data": "https://botmanager.nexination.com/", "name": "url"}
      , {"mimeType": "application/x-x509-ca-cert", "data": this.options.cert, "name": "certificate"}
    ];
    let multipartRequest = this.lib.multipartGenerate.request(multipartData);
    multipartRequest.headers['Host'] = 'api.telegram.org';
    multipartRequest.headers['User-Agent'] = 'Node.JS';
    multipartRequest.headers['Accept-Encoding'] = 'gzip,deflate';
    
    let request = this.lib.https.request({
      hostname: 'api.telegram.org',
      port: 443,
      path: this.options.baseUrl + 'setWebhook',
      method: 'POST',
      headers: multipartRequest.headers
    });
    
    request.on('error', function (error) {
      console.log(error);
    });
    request.on('response', function (response) {
      let data = '';
      response.on('data', function (chunk) {
        data += chunk;
      });
      response.on('end', function () {
        console.log('Webhook mode:');
        console.log(data);
      });
    });
    
    request.write(multipartRequest.body);
    request.end();
  }
  watchUpdates() {
    this.apiCall('getUpdates', {"offset": (this.data.updateCount + 1)});
    
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
      this.lib.https.get(this.options.baseUrl + apiToCall, (request) => {this.apiReturn(request);}).on('error', (error) => {
        console.log(error);
      });
    };
    return false;
  }
  apiReturn(request) {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => {
      let jsonData = {};
      try {
        jsonData = JSON.parse(data);
      }
      catch(error) {
        console.log(error);
      };
      console.log(data);
      
      // Check for old or new way
      let envelope = {};
      if(jsonData.hasOwnProperty('message')) {
        envelope = jsonData;
        this.parseMessage(envelope);
      }
      else if(jsonData.hasOwnProperty('result')) {
        for(let i = 0; i < jsonData.result.length; i += 1) {
          envelope = jsonData.result[i];
          this.parseMessage(envelope);
        };
      };
    });
  }
  parseMessage(envelope) {
    let message = envelope.message;
    this.data.updateCount = envelope.update_id;
    console.log(message);
    
    if(!this.data.users.hasOwnProperty(message.chat.id)) {
      this.data.users[message.chat.id] = { "name": (message.chat.username || message.chat.title)};
    };
    if(message.hasOwnProperty('text')) {
      // Command
      if(message.text.substr(0,1) === '/') {
        let functionCall = message.text;
        functionCall = (functionCall.indexOf('/') === 0 ? functionCall.substr(1) : '');
        functionCall = (functionCall.indexOf('@') >= 0 ? functionCall.substr(0, functionCall.indexOf('@')) : functionCall);
        
        if(this.functionReferenceStore.hasOwnProperty(functionCall)) {
          this.functionReferenceStore[functionCall](envelope);
        };
      }
      // Text
      else if(message.text.trim() !== '') {
        if(this.data.users[message.chat.id].hasOwnProperty('deferredAction')) {
          this.data.users[result.message.chat.id]['deferredAction'](envelope);
          delete this.data.users[message.chat.id]['deferredAction'];
        }
        else if(this.functionReferenceStore.hasOwnProperty('default')) {
          this.functionReferenceStore['default'](envelope);
        };
      };
    };
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