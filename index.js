// packages import
const express = require("express");
const app = express();
const basicAuth = require('express-basic-auth');
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
const convert = require('xml-js');
// enable CORS
app.use(cors());
app.use(bodyParser.json());
app.all('*',function(req,res,next)
{
    if (!req.get('Origin')) return next();

    res.set('Access-Control-Allow-Origin','*');
    res.set('Access-Control-Allow-Methods','GET,POST');
    res.set('Access-Control-Allow-Headers','X-Requested-With,Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);

    next();
});


// set the port on which our app wil run
// important to read from environment variable if deploying
const port = process.env.PORT || 5000;
const headers = { 'Authorization': 'Bearer 0a1ef137-e0d8-40d6-bf1c-c7fe3df97a18' };
const apiUrl = 'https://poc2.demo.dev.charge.ampeco.tech/public-api';
const apiVersion = 'v1.0';

// basic string route to prevent Glitch error
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.post("/", (req, res) => {
    res.redirect('https://testdeploy-blush.vercel.app/public/cs/charging');
});

app.post("/public/cs/test", (req, res) => {
    res.send("testsite");
});

app.get("/location/:id", (req, res) => {    
    getLocation(req.params.id)
        .then(locationData => res.status(200).send(locationData))
        .catch(err => res.status(400).send(err.message));
});

app.get("/chargepoint/:physicalRef", (req, res) => {
    getChargePoint(req.params.physicalRef)
        .then(chargePoint => res.status(200).send(chargePoint))
        .catch(err => res.status(400).send(err.message));
});

app.get("/chargepoint/fullinfo/:physicalRef", (req, res) => {
    getChargePoint(res, req.params.physicalRef)
        .then(chargePoint => {                
            const evse = chargePoint.evses[0];        

            return {
                physicalReference: evse.physicalReference,
                maxPower: evse.maxPower / 1000,
                hardwareStatus: evse.hardwareStatus,            
                currentType: evse.currentType,
                connectorType: evse.connectors[0].type,
                locationId: chargePoint.locationId,
                tariffGroupId: evse.tariffGroupId
            }        
        }).then(result => {
            return getLocation(result.locationId).then(locationData => {            
                const location = {
                    id: locationData.id,
                    name: locationData.name.en,
                    detailed_description: locationData.detailed_description.en,
                    address: locationData.address.en,
                    thumbnail: "testtest"//locationData.location_image.thumbnail ?? 
                }            
                return {
                    ...result,
                    location
                };
            });        
        }).then(result => {        
            return getTariff(result.tariffGroupId).then(tariffData => {                
                const tariffPricePerKwh = tariffData.pricing.pricePerKwh;
                return {
                    ...result,
                    tariffPricePerKwh
                }
            });
        }).then(result => res.status(200).send(result))
        .catch(err => {            
            res.status(400).send(err.message)
        });
});

app.get("/chargepoint/fullinfo/:physicalRef/charging", (req, res) => {
    getChargePoint(res, req.params.physicalRef)
        .then(chargePoint => {                
            const evse = chargePoint.evses[0];        

            return {
                physicalReference: evse.physicalReference,
                maxPower: evse.maxPower / 1000,
                hardwareStatus: evse.hardwareStatus,            
                currentType: evse.currentType,
                connectorType: evse.connectors[0].type,
                locationId: chargePoint.locationId,
                tariffGroupId: evse.tariffGroupId
            }        
        }).then(result => {
            return getLocation(result.locationId).then(locationData => {            
                const location = {
                    id: locationData.id,
                    name: locationData.name.en,
                    detailed_description: locationData.detailed_description.en,
                    address: locationData.address.en,
                    thumbnail: locationData.location_image.thumbnail
                }            
                return {
                    ...result,
                    location
                };
            });        
        }).then(result => {        
            return getTariff(result.tariffGroupId).then(tariffData => {                
                const tariffPricePerKwh = tariffData.pricing.pricePerKwh;
                return {
                    ...result,
                    tariffPricePerKwh
                }
            });
        }).then(result => res.status(200).send(result))
        .catch(err => {            
            res.status(400).send(err.message)
        });
});

const getChargePoint = (res, evsePhysicalReferenceId) => {    
    const backendUrl = `${apiUrl}/resources/charge-points/${apiVersion}?filter[evsePhysicalReference]=${evsePhysicalReferenceId}`;
    return axios.get(backendUrl, {
        headers: headers,
    }).then(response => {
        if (response.data.data.length === 0 || response.data.data.length > 1
            || response.data.data[0].evses.length === 0 || response.data.data[0].evses.length > 1) {
            throw Error('Could not find charge point');
        } else {
            return response.data.data[0];
        }
    });
}

const getLocation = (locationId) => {
    const url = `${apiUrl}/resources/locations/${apiVersion}/${locationId}`;
    return axios.get(url, {
        headers: headers,
    }).then(response => {        
        return response.data.data;
    });
}

const getTariff = (tariffGroupId) => {
    const url = `${apiUrl}/resources/tariffs/${apiVersion}?filter[tariffGroupId]=${tariffGroupId}}&filter[userId]=`;
    return axios.get(url, {
        headers: headers,
    }).then(response => {
        if (response.data.data.length === 0 || response.data.data.length > 1) {
            throw Error('Could not find tariff');
        }
        return response.data.data[0];
    });
}

app.post("/startcharge/:evseId", (req, res) => {
    // replace with a custom URL as required
    const backendUrl = `${apiUrl}/actions/evse/${apiVersion}/5/start`;
        fetch(backendUrl, {
            method: 'POST',
            headers: {
            'Authorization': 'Bearer 0a1ef137-e0d8-40d6-bf1c-c7fe3df97a18',
            }
            })
            .then(function(response) {
                if (response.status !== 202) {
                    throw Error(response.status);
                } return response.json();
            })
            .then(function(response) {
                console.log(response);
                res.send(response);
            })
            .catch(function(error) {
                res.send(error);

            })
});

app.post("/altapay/:id", (req, res) => {

    let username = "oystein.tomassen@wattif.no";
    let password = "j7fyrH4.?H6C";
    let bufferUsername = Buffer.from(username + ':' + password).toString('base64');
    let headers = new Headers();
    headers.append('Authorization', 'Basic ' + bufferUsername);
    console.log("username", bufferUsername);
    const backendUrl = `https://testgateway.altapaysecure.com/merchant/API/createPaymentRequest?terminal=Wattif Test Shop Test Terminal&shop_orderid=${req.params.id}&amount=5&currency=EUR&config[callback_ok]=https://quaint-ray-bonnet.cyclic.app/`;
        fetch(backendUrl, {
            method: 'POST',
            headers: headers,
            })
            .then(resp => resp.text()).then(response => res.send(convert.xml2json(response, {compact: true, spaces: 4})))
});

// console text when app is running
app.listen(port, () => {
    console.log(`server listening at http://localhost:${port}`);
});