'use strict';

const express = require('express');

const app = express();
const api = require('./api');

const port = process.env.PORT || 4443; 

app.use('/api', api);

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(port, function () {
  console.log('Listening on port ' + port);
});