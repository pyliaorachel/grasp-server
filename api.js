'use strict';

const Router = require('express').Router;
const router = new Router();

const translationApi = require('./translationApi');
const sentimentApi = require('./sentimentApi');
const dataRetrieve = require('./dataRetrieve');

router.get('/test', (req, res) => {
	// const q = '你好';
	// translationApi.getTranslation(q)
	// 	.then((response) => response.json())
	// 	.then((response) => {
	// 		console.log(response);
	// 		res.send(response);
	// 	})

	// const content = 'First of all, this is the most boring CC I have ever taken. There are two professors. The hong kong-nese  professor is very boring, he basically just put a lot of inofrmation on the powerpoint slides. The indian professor was better but the content was very simple. There is  a group presentation, a 300 word essay, and two in-class tests that\'s it. The workload is relatively small. Basically is trying to analyze science from journalism point-of-view. Don\'t need to be very familiar with science, so people who are afraid of science can keep this course in mind.';

	// sentimentApi.getSentiment(content)
	// 	.then((response) => response.json())
	// 	.then((response) => {
	// 		console.log(response);
	// 		res.send(response);
	// 	})

	dataRetrieve.getData('hku', 'cc');
	res.send('ok');
});

module.exports = router;
