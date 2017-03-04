'use strict';

const Router = require('express').Router;
const router = new Router();

const translationApi = require('./translationApi');
const sentimentApi = require('./sentimentApi');
const dataRetrieve = require('./dataRetrieve');

router.get('/updataData', (req, res) => {
	dataRetrieve.getComments('hku', 'cc')
  	.then((data) => {
      Object.keys(data).forEach((courseCategory) => {
        Object.keys(data[courseCategory]).forEach((courseCode) => {
          dataRetrieve.updateSentimentData('hku', courseCategory, courseCode, data[courseCategory][courseCode]);
        });
      });
    });
	res.send('ok');
});

module.exports = router;
