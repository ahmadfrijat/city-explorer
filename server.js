'use strict'

let express = require('express');


let app = express();
require('dotenv').config();

const PORT = process.env.PORT;
app.listen(PORT, ()=>{
    console.log('the app is listining on port '+PORT);
});



