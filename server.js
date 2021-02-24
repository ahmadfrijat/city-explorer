'use strict'


// Application Dependencies

let express = require('express');
const cors = require('cors');
let superagent = require('superagent');
const pg = require('pg');

// Application Setup

let app = express();
app.use(cors());

// Load environment variables from .env file

require('dotenv').config();
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });
const PORT = process.env.PORT;

// Route Definitions

app.get('/location', handelLocation);
app.get("/weather", handleWeather);
app.get('/parks', handleparks);
app.get('/movies', handlemovies);
app.get('/yelp', handleYalps);
app.get('*', handle404);


/////////////////////////////////////////////////////////////////////location//////////////////////////////////////////////////////////////////////////////
//////////handel function//////////


function handelLocation(req, res) {
    try {
        let searchQuery = req.query.city;
        getLocationData(searchQuery, res);

    } catch (error) {
        res.status(500).send('Sorry, something went wron' + error);
    }
}

//////////get data function//////////


function getLocationData(searchQuery, res) {

    let sqlQuery = "SELECT * FROM citylocation WHERE c_name = ($1) ";
    let value = [searchQuery];
    client.query(sqlQuery, value).then(data => {


        if (data.rows.length === 0) {
            const query = {
                key: process.env.GEOCODE_API_KEY,
                q: searchQuery,
                limit: 1,
                format: 'json'
            }


            let url = `https://us1.locationiq.com/v1/search.php`;
            superagent.get(url).query(query).then(data => {
                try {
                    let longitude = data.body[0].lon;
                    let latitude = data.body[0].lat;
                    let displayName = data.body[0].display_name;
                    let sqlQuery = `insert into citylocation(c_name,display_name, lat, lon) values ($1,$2,$3,$4)returning *`;
                    let value = [searchQuery, displayName, latitude, longitude];
                    client.query(sqlQuery, value).then(data => {
                        console.log('data returned back from db ', data);
                    });
                    let responseObject = new Citylocation(searchQuery, displayName, latitude, longitude);
                    res.status(200).send(responseObject);
                } catch (error) {
                    res.status(500).send(error);
                }

            }).catch(error => {
                res.status(500).send("Cannot connect with the api " + error);

            });
        }
        else {
            let responseObject = new Citylocation(data.rows[0].c_name, data.rows[0].display_name, data.rows[0].lat, data.rows[0].lon);
            res.status(200).send(responseObject);
        }

    }).catch(error => {
        console.log('canoot data returned back from db in check function ', error);
    });



}

//////////constructor//////////


function Citylocation(searchQuery, displayName, lat, lon) {
    this.search_query = searchQuery;
    this.formatted_query = displayName;
    this.latitude = lat;
    this.longitude = lon;
}


/////////////////////////////////////////////////////////////////////////////Weather//////////////////////////////////////////////////////////////////////
//////////handel function//////////


function handleWeather(req, res) {

    let lat = req.query.latitude;
    let log = req.query.longitude;
    getWeatherData(res, log, lat);
}

//////////get data function//////////


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

                let responseObject = new Weather(forecast[i].weather.description, stringDate);
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


//////////constructor//////////


function Weather(forecast, time) {
    this.forecast = forecast;
    this.time = time;
}


/////////////////////////////////////////////////////////////////////////////////parks//////////////////////////////////////////////////////////////////
//////////handel function//////////


function handleparks(req, res) {

    let lat = req.query.latitude;
    let log = req.query.longitude;
    getparkData(res, log, lat);
}


//////////get data function//////////


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


//////////constructor//////////


function Park(element) {
    this.name = element.name;
    this.address = element.address;
    this.fee = element.fee;
    this.description = element.description;
}


/////////////////////////////////////////////////////////////////////////////////movies//////////////////////////////////////////////////////////////////
//////////handel function//////////


function handlemovies(request, response) {
    let city = request.query.search_query;
    // console.log(city)
    getMoviesData(city)
        .then((data) => {
            response.status(200).send(data);
        });
}


//////////get data function//////////


function getMoviesData(city) {
    const MOVIE_API_KEY = process.env.MOVIE_API_KEY;
    const moviesUrl = `https://api.themoviedb.org/3/search/movie?api_key=${MOVIE_API_KEY}&language=en-US&query=${city}&page=1&include_adult=false`
    return superagent.get(moviesUrl)
        .then((moviesData) => {
            // console.log(moviesData.body);
            const movies = moviesData.body.results.map((data) => new Movies(data));
            return movies;
        });
}


//////////constructor//////////


function Movies(data) {
    this.title = data.title;
    this.overview = data.overview;
    this.average_votes = data.vote_average;
    this.total_votes = data.vote_count;
    this.image_url = `https://image.tmdb.org/t/p/w500/${data.poster_path}`;
    this.popularity = data.popularity;
    this.released_on = data.release_date;
}



/////////////////////////////////////////////////////////////////////////////////yelps//////////////////////////////////////////////////////////////////
//////////handel function//////////


function handleYalps(req, res) {
    const city = req.query.search_query;
    getYelpdata(city)
        .then(data => res.status(200).json(data));
}


//////////get data function//////////


function getYelpdata(city) {
    let YELP_API_KEY = process.env.YELP_API_KEY;
    let url = `https://api.yelp.com/v3/businesses/search?location=${city}`;
    return superagent.get(url)
        .set('Authorization', `Bearer ${YELP_API_KEY}`)
        .then(data => {
            console.log(data.body.businesses);
            return data.body.businesses.map(val => {
                return new Yelp(val);
            });
        });
}


//////////constructor//////////


function Yelp(data) {
    this.name = data.name;
    this.image_url = data.image_url;
    this.price = data.price;
    this.rating = data.rating;
    this.url = data.url;
}



////////////////////////////////////////////////////////////////////////////////////EXPRESS RENDERERS////////////////////////////////////////////////////////////////////
function handle404(req, res) {
    res.status(404).send('sorry , the page dose not exist....');
}

// app.listen(PORT, () => {
//     console.log('the app is listining on port ' + PORT);
// });

// Database Setup
client.connect().then(() => {
    app.listen(PORT, () => {
        console.log('the app is listining on port ' + PORT);
    });
}).catch(error => {
    console.log('an error occurred while connecting to database ' + error);
});