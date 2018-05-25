/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/
require('dotenv').config();

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');

var Store = require('./handlers/store');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, '127.0.0.1' ,function () {
    console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

var inMemoryStorage = new builder.MemoryBotStorage();

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
}).set('storage', inMemoryStorage);

const LuisModelUrl = process.env.LuisModelUrl;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

bot.dialog('GreetingDialog',
    (session) => {
        session.send('Hello! Welcome to YBS Chat. How may I help you?');
        session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('Branch-Locater', [
    // Initial function for Branch-locator intent        
    (session, args, next) => {
        var locationObject = builder.EntityRecognizer.findEntity(args.intent.entities, 'City');
        if(!locationObject){
            builder.Prompts.text(session, 'At which location are you looking for a YBS Branch?');
        }
        else {
            var location = locationObject['entity'];
            next({response: location})
        }
    },
    (session, results, next) => {
        const response = results.response;
        session.send('Sure! Let me just look up the nearest branch in \%s\ for you! ', response);
        
        // Async Call to StoreLocator Handler

        Store.storeLocator(response).then( function(stores) {
            setTimeout(()=> {
                session.send('I have found %s branches in %s for you.', stores.branches.length, response);
            }, 250);
            setTimeout(()=> {
                session.send('The nearest branch is %s away', stores.branches[0].distance);    
            }, 250);
            setTimeout(()=> {
                session.send('The details of the nearest branch are: \n Address: %s \n Phone: %s', stores.branches[0].address, stores.branches[0].phone);
            }, 250);
        });
        
        session.endDialog();
    }
]).triggerAction({
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

