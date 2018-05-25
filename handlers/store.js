var request = require('request');
var fetch = require('node-fetch');

module.exports = {
    storeLocator: async (location) => {
        console.log('initiated');
        const stores = await fetch(`https://ybsg-nonprod-dev.apigee.net/mortgage/v1.0/applications/branchLocator?postcode=${location}`, {
            method: 'GET'
        });
        const response = await stores.json();
        return response;
    }
}