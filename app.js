/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/
require('dotenv').config();

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');

var momentBusiness = require('moment-business-days');
var moment = require('moment');
momentBusiness.locale('en-gb');

var Store = require('./handlers/store');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
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

var locations = [];
var selectedBranchObject = {};
var selectedScheduleObject = {}

bot.dialog('Branch-Locater', [
    // Initial function for Branch-locator intent        
    (session, args, next) => 
        {
            var intent = args.intent;
            title = builder.EntityRecognizer.findEntity(intent.entities, 'Weather.Location');
            console.log("title---",title);
            var note = session.dialogData.note = {
            title: title ? title.entity : null,
            };
        
            var localtionurl1='https://ybsg-nonprod-dev.apigee.net/mortgage/v1.0/applications/branchLocator?postcode='+title.entity;
            request(localtionurl1, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    //session.send("Thank you for Location.Here are the option for your nearby branches.Please select your appropriate branch");
                        var result=JSON.parse(body);
                        console.log("print result----",result.branches[0]);
                            var msg = new builder.Message(session);
                            msg.text("Thank you for sharing your location.Here are the options for your nearby branches.");
                        
                    msg.attachmentLayout(builder.AttachmentLayout.carousel)
                    locations = result.branches;
                    session.beginDialog('LocationDetails');
                }
            })
        }
    ]).triggerAction({
    matches: 'Branch-Locater'
})

bot.dialog('LocationDetails', [
    (session) => {
        const locationNames = locations.map(element => element.branchName);
        builder.Prompts.choice(
            session, 
            "Here are the options for your nearby branches. Please select appropriate branch for more details", 
            locationNames, 
            { listStyle: builder.ListStyle.button }
        );
    },
    (session, results) => {
        const selectedLocation = results.response.entity;
        const selectedIndex = results.response.index;
        selectedBranchObject = locations[selectedIndex];
        console.log(selectedBranchObject);

        const message = `<b>Branch Details<b>:  \n Address:  ${locations[selectedIndex].address} \n Distance: ${locations[selectedIndex].distance}`;
        const options = ['Book an Appointment', 'Select Other'];

        builder.Prompts.choice(
            session, 
            message,
            options,
            { listStyle: builder.ListStyle.button }
        );
    },
    (session, results) => {
        const selectedOption = results.response.index;
        if(selectedOption == 0) {
            session.beginDialog('/dayButtonClick');
        }
        else {
            session.beginDialog('LocationDetails');
        }
    }
]);


bot.beginDialogAction('dayButtonClick','/dayButtonClick');

bot.dialog('/dayButtonClick',
    [
        (session, args) => {
            const message = 'Please select the appropriate date for an appointment.';
            const fiveBusinessDays=[];
            let todayDate=momentBusiness(new Date()).format('DD-MM-YYYY');
            fiveBusinessDays.push(todayDate);
            for(let i=0;i<5;i++){
                const nextDate=momentBusiness(todayDate, 'DD-MM-YYYY').nextBusinessDay()._d;
                fiveBusinessDays.push(moment(nextDate).format('DD-MM-YYYY'));
                todayDate=nextDate;
            }
            builder.Prompts.choice(
                session, 
                message,
                fiveBusinessDays,
                { listStyle: builder.ListStyle.button }
            );
        },
        (session, results) => {
            selectedDate = results.response;
            console.log('Selected Date: ', selectedDate);
            
            selectedScheduleObject.date = selectedDate.entity;
            session.beginDialog('/timeButtonClick');
        }
    ]
);

bot.beginDialogAction('timeButtonClick','/timeButtonClick');
bot.dialog('/timeButtonClick',
    [
        (session, args) => {
            // Save size if prompted
            // session.send("Thanks you for choosing for Book an Appointment. Please select the appropriate Date.");
            var message = " Please select your suitable time."
            console.log('>>>>>>>>>>>>');
            console.log(selectedBranchObject);
            var availableSlots = selectedBranchObject.availableSlot.timing;
            builder.Prompts.choice(
                session, 
                message,
                availableSlots,
                { listStyle: builder.ListStyle.button }
            );
        },
        (session, results) => {
            selectedScheduleObject.time = results.response.entity;
            session.send("Great! I've setup an appointment with an Agent at %s branch. Here are the Appointment Details", selectedBranchObject.branchName);
            session.send('Branch Name: %s \n Date: %s \n Time: %s', selectedBranchObject.branchName, selectedScheduleObject.date, selectedScheduleObject.time );
        }   
    ]
);

bot.dialog('BookAppointmentDialog', 
    [ 
        (session, args, next) => {
            var intent = args.intent;
            title = builder.EntityRecognizer.findEntity(intent.entities, 'Weather.Location');
            console.log("titleee---",title);
                var note = session.dialogData.note = {
                title: title ? title.entity : null,
            };
            var localtionurl1='https://ybsg-nonprod-dev.apigee.net/mortgage/v1.0/applications/branchLocator?postcode='+title.entity;
            request(localtionurl1, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    //session.send("Thank you for sharing your location.Here are the options for your nearby branches.Please select your appropriate branch");
                    var result=JSON.parse(body);
                    

                    session.send("Let's book an appointment for you.");
                    console.log('locations before condition check: ', locations);
                    if(locations.length>0){
                        console.log('inside the condition:', locations);
                        session.beginDialog('/dayButtonClick')    
                    }
                    else {
                        session.send("Please select your appropriate location that you intend to visit.");
                        console.log(result.branches);
                        const message = 'Here are the nearby branches as per your location';
                        const locationNames = [];
                        locations = result.branches;
                        result.branches.forEach(element => {
                            locationNames.push(element.branchName);
                        });
                        builder.Prompts.choice(
                            session,
                            message,
                            locationNames,
                            { listStyle: builder.ListStyle.button }
                        );

                    }
                }
            })
        },
        (session, results) => {
            selectedBranchObject = locations[results.response.index];
            session.beginDialog('/dayButtonClick');
        }
    ]
).triggerAction({
    matches: 'BookAppointment'
});


bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Cancel'
})

