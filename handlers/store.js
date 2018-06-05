var request = require('request');
var fetch = require('node-fetch');

const getFormattedDate = (dateToFormat, timeToFormat, isEndTime) => {
  // format date and time
  const date = dateToFormat.split('-');
  const timeHours = timeToFormat.split('-')[0].substring(0,2);
  const timeMinutes = timeToFormat.split('-')[0].substring(2,4);

  return new Date(
    Number(date[2]),
    Number(date[1]-1),
    Number(date[0]),
    isEndTime ? Number(timeHours) + 1 : Number(timeHours),
    Number(timeMinutes),
  ).toISOString();
};

module.exports = {
  storeLocator: async (location) => {
    console.log('initiated');
    const stores = await fetch(
      `https://ybsg-nonprod-dev.apigee.net/mortgage/v1.0/applications/branchLocator?postcode=${location}`,
      {
        method: 'GET',
      },
    );
    const response = await stores.json();
    return response;
  },
  makeAppointment: async (time, date) => {
    const appointmentStartTime = getFormattedDate(date, time, false);
    const appointmentEndTime = getFormattedDate(date, time, true);

    console.log(appointmentStartTime, appointmentEndTime);

    const url = `https://ybsg-nonprod-dev.apigee.net/mortgage/v1.0/applications/appointment`;

    const body = {
      appointmentStartTime,
      appointmentEndTime,
      LettingAgentsEmailId: 'nsaini@ybs.co.uk', // <-This we might need to change
    };
    const ybsAPIKey = 'Mwd7JVAwnA5XEY6RxUWCw8Wh09ej';
    try {
      const data = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ybsAPIKey}` },
      });

      const response = await data.json();
      console.log(response);
      return response;
    } catch (error) {
      console.log(error);
      return;
    }
  },
};
