var request = require('request');
var fetch = require('node-fetch');

const getFormattedDate = (dateToFormat, timeToFormat, isEndTime) => {
  // format date and time
  const date = dateToFormat.split('-');
  const time = timeToFormat.split(':');
  return new Date(
    Number(date[0]),
    Number(date[1]),
    Number(date[2]),
    isEndTime ? Number(time[0]) + 1 : Number(time[0]),
    Number(time[1]),
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
