"use strict";
var TelegramBotLib = function(settings) {
    var https = require('https');
    var fs = require('fs');
    var main = this;
    
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
    this.functionReferenceStore = {};
    
    this.__construct = function() {
        main.options.baseUrl += settings.botToken + '/';
        
        setInterval(main.watchUpdates, this.options.updateTime);
        main.watchUpdates();
        
        return false;
    };
    this.buildMultipartForm = function() {
        
    };
    this.watchUpdates = function() {
        main.apiCall('getUpdates', {"offset": main.data.updateCount});
        
        return false;
    };
    this.apiCall = function(call, data) {
        var apiCalls = this.options.apiCalls;
        var apiToCall = '';
        if(apiCalls.hasOwnProperty(call)) {
            // Replace placeholder with values from data object
            apiToCall = apiCalls[call].replace(
                /\${([a-z]+)}/gim
                , function(replacement) {
                    var replaced = '';
                    replacement = replacement.substr(2, (replacement.length -3));
                    
                    if(data.hasOwnProperty(replacement)) {
                        replaced = encodeURIComponent(data[replacement]);
                    };
                    
                    return replaced;
                }
            );
            
            // Call the API
            https.get(this.options.baseUrl + apiToCall, this.apiReturn).on('error', function(e) {
                console.error(e);
            });
        };
        return false;
    };
    this.apiReturn = function(resource) {
        var dataCount = 0;
        var fullData = '';
        var dataLength = parseInt(resource.headers['content-length']);
        
        resource.on('data', function(data) {
            if(dataCount !== dataLength) {
                fullData += data;
                dataCount += data.length;
            };
            if(dataCount === dataLength) {
                var jsonData = {};
                try {
                    jsonData = JSON.parse(fullData);
                }
                catch(error) {
                    console.log(error);
                };
                
                // Checks if the API call was a success
                if(jsonData.hasOwnProperty('ok') && jsonData.ok && jsonData.result.hasOwnProperty('length')) {
                    var resultLength = jsonData.result.length
                    for(var i = 0; i < resultLength; i += 1) {
                        var result = jsonData.result[i];
                        // Log all results
                        console.log(result.message.chat.id, result.message.text);
                        if(result.message.text !== undefined) {
                            let functionCall = result.message.text;
                            functionCall = (functionCall.indexOf('/') === 0 ? functionCall.substr(1) : '');
                            functionCall = (functionCall.indexOf('@') >= 0 ? functionCall.substr(0, functionCall.indexOf('@')) : '');
                            
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
    };
    this.on = function(functionName, functionReference) {
        main.functionReferenceStore[functionName] = functionReference;
        
        return false;
    };
    this.deferAction = function(chatId, action) {
        if(typeof(chatId) === 'number' && typeof(action) === 'function') {
            main.data.users[chatId]['deferredAction'] = action;
        };
        return false;
    };
    this.deferActionRemove = function(chatId) {
        if(typeof(chatId) === 'number') {
            delete main.data.users[chatId]['deferredAction'];
        };
        return false;
    };
    this.__construct();
};
try {
    exports.TelegramBotLib = TelegramBotLib;
}
catch(error) {
    // No need to do anything, only here for NodeJS compatibility
};