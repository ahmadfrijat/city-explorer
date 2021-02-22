'use strict'

let express = require('express');
const cors = require('cors');
let superagent = require('superagent');

let app = express();
app.use(cors());
require('dotenv').config();

const PORT = process.env.PORT;


app.get('/location', handelLocation);
app.get("/weather", handleWeather);
app.get('/parks', handleparks);
app.get('*', handle404);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function handelLocation(req, res) {
    let searchQuery = req.query.city;
    getLocationData(searchQuery, res);

};


function getLocationData(searchQuery, res) {
    let key = process.env.GEOCODE_API_KEY
    let url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${searchQuery}&format=json`
    superagent.get(url).then(data => {
        try {
            let longitude = data.body[0].lon;
            let latitude = data.body[0].lat;
            let displayName = data.body[0].display_name;
            let responseObject = new Citylocation(searchQuery, displayName, latitude, longitude)
            res.status(200).send(responseObject);

        } catch (error) {
            res.status(500).send(error);
        }
    }).catch(error => {
        res.status(500).send('there was an error getting data from API' + error);

    });

};



function Citylocation(searchQuery, displayName, lat, lon) {
    this.search_query = searchQuery;
    this.formatted_query = displayName;
    this.latitude = lat;
    this.longitude = lon;
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function handleWeather(req, res) {

    let lat = req.query.latitude;
    let log = req.query.longitude;
    getWeatherData(res, log, lat);
}


function getWeatherData(res, lat, log) {

    try {
        let query = {
            lat: lat,
            lon: log,
            key: process.env.WEATHER_API_KEY
        }
        let url = 'https://api.weatherbit.io/v2.0/forecast/daily';



        superagent.get(url).query(query).then(data => {
            let weatherArray = [];
            let forecast = data.body.data;
            for (let i = 0; i < forecast.length; i++) {
                let newDateTime = new Date(forecast[i].valid_date).toString();
                let stringDate = newDateTime.split(" ").splice(0, 4).join(" ");

                let responseObject = new CityWeather(forecast[i].weather.description, stringDate);
                weatherArray.push(responseObject);
            }
            res.status(200).send(weatherArray);
        }).catch(error => {
            res.status(500).send(error);
        })
    } catch (error) {
        res.status(500).send('there was an error getting data from API' + error);
    }

}

function CityWeather(forecast, time) {
    this.forecast = forecast;
    this.time = time;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function handleparks(req, res) {

    let lat = req.query.latitude;
    let log = req.query.longitude;
    getparkData(res, log, lat);
}

function getparkData(res, lat, log) {

    let parkArray = [];
    let key = process.env.PARKS_API_KEY;

    let url = `https://developer.nps.gov/api/v1/parks?lat=${lat}&lon=${log}&parkCode=acad&api_key=${key}`;

    superagent.get(url).then(getData => {
        parkArray = getData.body.data.map((val) => {
            return new Park(val);

        })
        res.status(200).json(parkArray);

    })


};

function Park(element) {
    this.name = element.name;
    this.address = element.address;
    this.fee = element.fee;
    this.description = element.description;


}

function handle404(req, res) {
    res.status(404).send('sorry , the page dose not exist....');
}

app.listen(PORT, () => {
    console.log('the app is listining on port ' + PORT);
});