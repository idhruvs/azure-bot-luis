/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var fetch = require('node-fetch');
var config= require('./config.js');

var accessToken = '';
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, '127.0.0.1' ,function () {
    console.log('%s listening to %s', server.name, server.url); 
    // _initiateTokenFetch();
});
  
// _initiateTokenFetch = async () => {
//     console.log('Initiating Token Fetch Action');
//     try {
//         const reqHeaders = {
//             "Authorization" : "Basic c1FwRWRBTjIyZ01neXo4VWMwVXhta0VlOUF3emJJa3E6QXB6RW1SMTFQcmJhMEtWcw==",
//             "Content-Type" : "application/x-www-form-urlencoded"
//         };
//         const reqBody = {
//             "grant_type": "client_credentials"
//         }
//         console.log(reqHeaders);
//         console.log(JSON.stringify(reqBody));
//         const tokenResponse = await fetch(config.TOKEN_URL, {
//             method: 'POST',
//             headers: reqHeaders,
//             body: JSON.stringify(reqBody)
//         });
    
//         const responseBody = await tokenResponse.json();
//         console.log(responseBody);
//         accessToken = responseBody['access_token'];
//         console.log(accessToken);
//     } catch(e) {
//         console.log(e);
//     }
    
    
// }


// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
});

bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 
bot.dialog('GreetingDialog',
    (session) => {
        session.send('You reached the Greeting intent. You said.');
        session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('Branch-Locater',
    (session) => {
        session.send('Let me just look that up for you!');
        console.log(session);
        session.send('The nearest branch in ', session.message.text, 'is at.... ');
        session.endDialog();
    }
).triggerAction({
    matches: 'Branch-Locater'
})


bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Cancel'
})

