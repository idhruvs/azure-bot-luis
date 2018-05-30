var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');

var moment = require('moment-business-days');

moment.locale('us', {
   workingWeekdays: [1,2,3,4,5,6] 
});

var date=new Date();
var dat=JSON.stringify(date);
var prn=dat.substring(1,11);
    
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, '127.0.0.1', function () {
    
    console.log(prn);
    var nextDate=moment(prn, 'YYYY-MM-DD').nextBusinessDay()._d;
    nextDate=JSON.stringify(nextDate);
    var next=nextDate.substring(1,11);
    console.log(next);
    var nextDat=moment(nextDate, 'YYYY-MM-DD').nextBusinessDay()._d;
    console.log(nextDat);
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
var luisAppId = process.env.LuisAppId ||  '7c596bb6-39c0-43fc-84d8-e16021c36ef5';
var luisAPIKey = process.env.LuisAPIKey || '3dfeb35610a34c0fb1956d8b64db22d8';
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

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

var title="";
var locations=[];

bot.dialog('LocationDialog',
    [ 
        (session, args, next) => 
        {
            // Resolve and store any Note.Title entity passed from LUIS.
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
    matches: 'Location'
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
        
        console.log('Selected Location: ', selectedLocation);
        const message = `Address:  ${locations[selectedIndex].address} \n Distance: ${locations[selectedIndex].distance}`;
        const options = ['Book an Appointment', 'Select Another Branch'];

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
bot.dialog('/dayButtonClick',function (session, args) {
        // Save size if prompted
   // session.send("Thanks you for choosing for Book an Appointment. Please select the appropriate Date.");
         var msg = new builder.Message(session);
         console.log(session.data);
       msg.attachmentLayout(builder.AttachmentLayout.carousel)
    
   msg.text("Please select the appropriate date for an appointment.");
      var dateArray=[];
       for(var j=0;j<6;j++)
    {
        var prn=dat;
        var nextDate=prn.substring(1,11);
       dateArray.push(new builder.HeroCard(session)
            
            .buttons([
                 builder.CardAction.dialogAction(session, 'timeButtonClick','Mon', nextDate)
            ]))
            nextDate=moment(prn, 'YYYY-MM-DD').nextBusinessDay()._d;
            nextDate=JSON.stringify(nextDate);
            dat=nextDate;
    }
    
    msg.attachments(dateArray);
       // msg.attachments([ new builder.HeroCard(session)
        //    
        //     .buttons([
        //         builder.CardAction.dialogAction(session, 'timeButtonClick','Mon', "Monday")
        //     ]),
        //     new builder.HeroCard(session)
        //    
        //     .buttons([
        //         builder.CardAction.dialogAction(session, 'timeButtonClick','Tue', "Tuesday")
        //     ]),
        //     new builder.HeroCard(session)
        //    
        //     .buttons([
        //         builder.CardAction.dialogAction(session, 'timeButtonClick','Wed', "Wednesday")
        //     ]),
        //     new builder.HeroCard(session)
        //    
        //     .buttons([
        //         builder.CardAction.dialogAction(session, 'timeButtonClick','Thu', "Thursday")
        //     ]),
        //     new builder.HeroCard(session)
        //    
        //     .buttons([
        //         builder.CardAction.dialogAction(session, 'timeButtonClick','Fri', "Friday")
        //     ]),
        //     new builder.HeroCard(session)
        //    
        //     .buttons([
        //         builder.CardAction.dialogAction(session, 'timeButtonClick','Sat', "Saturday")
        //     ])])
  
         session.send(msg);

         });
         
       bot.beginDialogAction('timeButtonClick','/timeButtonClick');
bot.dialog('/timeButtonClick',function (session, args) {
        // Save size if prompted
   // session.send("Thanks you for choosing for Book an Appointment. Please select the appropriate Date.");
         var msg = new builder.Message(session);
       msg.attachmentLayout(builder.AttachmentLayout.carousel)
    
   msg.text(" Please select your suitable time.");
       
       msg.attachments([ new builder.HeroCard(session)
           
            .buttons([
                builder.CardAction.dialogAction(session, 'finalButtonClick','Mon', "10 am to 11 am")
            ]),
            new builder.HeroCard(session)
           
            .buttons([
                builder.CardAction.dialogAction(session, 'finalButtonClick','Tue', "11 am to 12 ")
            ]),
            new builder.HeroCard(session)
           
            .buttons([
                builder.CardAction.dialogAction(session, 'finalButtonClick','Wed', "12 pm to 1 pm ")
            ]),
            new builder.HeroCard(session)
           
            .buttons([
                builder.CardAction.dialogAction(session, 'finalButtonClick','Thu', "2 pm to 3 pm")
            ]),
            new builder.HeroCard(session)
           
            .buttons([
                builder.CardAction.dialogAction(session, 'finalButtonClick','Fri', "3 pm to 4 pm")
            ]),
            new builder.HeroCard(session)
           
            .buttons([
                builder.CardAction.dialogAction(session, 'finalButtonClick','Sat', "4 pm to 5 pm")
            ])])
  
         session.send(msg);

         });
  
         
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
