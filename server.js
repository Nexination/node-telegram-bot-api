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
      setInterval(() => {this.watchUpdates();}, this.options.updateTime);
    };
    
    return false;
  }
  createServer() {
    this.lib.https.createServer(this.options, (req, res) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        console.log('recieved:');
        console.log(data);
        res.writeHead(200);
        res.end("hello world\n");
      });
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
    
    console.log(multipartRequest.headers);
    console.log(multipartRequest.body.toString());
    
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
        console.log('EndRequest:');
        console.log(data);
      });
    });
    
    request.write(multipartRequest.body);
    request.end();
  }
  watchUpdates() {
    console.log('Checked for updates.');
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
      this.lib.https.get(this.options.baseUrl + apiToCall, (resource) => {this.apiReturn(resource);}).on('error', function(e) {
        console.error(e);
      });
    };
    return false;
  }
  apiReturn(resource) {
    console.log(this.data);
    let main = this;
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