var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');

var momentBusiness = require('moment-business-days');
var moment = require('moment');
momentBusiness.locale('en-gb');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, '127.0.0.1' ,function () {
    console.log('%s listening to %s', server.name, server.url); 
});
  
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});
server.post('/api/messages', connector.listen());

var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
});

bot.set('storage', inMemoryStorage);
var count;
var luisAppId = process.env.LuisAppId;
var luisAPIKey =  process.env.LuisAPIKey;
var luisAPIHostName = 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);



var title="";
var locations=[];
var selectedBranchObject = {};
var selectedScheduleObject = {};

bot.dialog('Branch-Locater',
    [ 
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
        }]
).triggerAction({
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
        const options = ['Book Appointment', 'Select Other'];

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
                var msg = " Please select your suitable time."
                var availableSlots = selectedBranchObject.availableSlots.timing;
                builder.Prompts.choice(
                    session, 
                    message,
                    availableSlots,
                    { listStyle: builder.ListStyle.button }
                );
                session.send(msg);

            },
            (session, results) => {
                selectedScheduleObject.time = results.response.entity;
                session.send("Thank you for selecting Date and Time, Here are the Appointment Details");
                session.send('Branch Name: %s \n Date: %s \n Time: %s', selectedBranchObject.branchName, selectedScheduleObject.date, selectedScheduleObject.time );
            }   
        ]
    );

    bot.beginDialogAction('finalButtonClick','/finalButtonClick');
    bot.dialog('/finalButtonClick',function (session, args) {
        session.send("Thank you for selecting Date and Time, Here are the Appointment Details");
    });
         
         
         
bot.dialog('BookDialog',[ function (session, args, next) {
        // Resolve and store any Note.Title entity passed from LUIS.
        var intent = args.intent;
        title = builder.EntityRecognizer.findEntity(intent.entities, 'Weather.Location');
console.log("titleee---",title);
        var note = session.dialogData.note = {
          title: title ? title.entity : null,
        };
        
   
    {
        var localtionurl1='https://ybsg-nonprod-dev.apigee.net/mortgage/v1.0/applications/branchLocator?postcode='+title.entity;
request(localtionurl1, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        //session.send("Thank you for sharing your location.Here are the options for your nearby branches.Please select your appropriate branch");
        var result=JSON.parse(body);
        console.log("print result----",result.branches[0]);
            var msg = new builder.Message(session);
            msg.text("Thank you for choosing Book an appointment.Here are the option for your nearby branches.Please select your appropriate branch");
              
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    var location=[];
    for(var i=0;i<result.branches.length;i++)
    {
       location.push(new builder.HeroCard(session)
           .title(result.branches[i].branchName)
            .subtitle(result.branches[i].address +',' + result.branches[i].city +','+result.branches[i].county+','+result.branches[i].postcode)
            .text("Branch distance " + result.branches[i].distance)
            //.images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/whiteshirt.png')])
            
            .buttons([
                builder.CardAction.dialogAction(session, 'dayButtonClick','abc', "Book an appointment")
            ]))
    }
     msg.attachments(location);
    
        
         session.send(msg);
         
         
         
        console.log(body) // Print the google web page.
     }
})
}
    }
       // Send confirmation to user 
    ]
).triggerAction({
    matches: 'Book'
})


bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Cancel'
})

bot.dialog('GreetingDialog',
    (session) => {
        session.send('Hello User, I am your Virtal Assistant, How may I help you today?');
        session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('HelpDialog',
    (session) => {
        session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Help'
})
