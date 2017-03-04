'use strict';

const fetch = require('node-fetch');
const qs = require('qs');
const merge = require('deepmerge');

const db = require('./db');
const translationApi = require('./translationApi');
const sentimentApi = require('./sentimentApi');

const sources = {
  hku: {    
    cc: {
      mainlandCCData: {
        urls: [
          // 'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/2/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/3/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/4/public/values?alt=json',
          'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/5/public/values?alt=json',
        ],
        titleField: 'gsx$coursetitle',
        codeField: 'title',
      },
      taiwanCCData: {
        urls: [
          'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/4/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/5/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/6/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/7/public/values?alt=json',
        ],
        titleField: 'gsx$coursename',
        codeField: 'title',
      },
    },
  },
};

function parseData(courseCategory, entries, titleField, codeField) {
  let courses = {};

  entries.forEach((entry) => {
    const courseCode = entry[codeField] && entry[codeField]['$t'];
    const courseTitle = entry[titleField] && entry[titleField]['$t'];

    if (courseCode && courseTitle) {

      const indexOfCourseTitle = Object.keys(entry).indexOf(titleField);

      // parse comments; get sentiment
      let comments = [];
      let score = 0;
      let magnitude = 0;

      Object.keys(entry).slice(indexOfCourseTitle+1).forEach((key) => {
        const comment = entry[key]['$t'];
        comments.push(comment);

        // fetches.push(translationApi.getTranslation(comment)
        //   .then(res => res.json())
        //   .then(res => {
        //     if (res.data) {
        //       const translatedText = res.data.translations[0].translatedText;
        //       const lang = res.data.translations[0].detectedSourceLanguage;

        //       comments.push({
        //         text: comment,
        //         lang,
        //       });

        //       return sentimentApi.getSentiment(translatedText)
        //         .then(res => res.json())
        //         .then(res => {
        //           magnitude += res.documentSentiment.magnitude;
        //           score += res.documentSentiment.score;
        //         })
        //         .catch(err => console.log(err));
        //     }
        //   })
        //   .catch(err => console.log(err)));
      });

      courses[courseCode] = {
        title: courseTitle,
        comments,
      };
    }
  });

  // prepare data
  let data = {};
  data[courseCategory] = courses;

  // return Promise.resolve(data);
  return data;
}

function mergeData(data1, data2) {
  return merge(data1, data2);
}

function getData(sourceSchool, courseType) {
  let targetInfos = sources[sourceSchool][courseType];
  let fetches = [];

  if (targetInfos) {
    Object.keys(targetInfos).forEach((info) => {
      const urlArray = targetInfos[info].urls;
      const titleField = targetInfos[info].titleField;
      const codeField = targetInfos[info].codeField;

      urlArray.forEach((url) => {
        fetches.push(
          fetch(url, {
            method: 'get',
          }).then((res) => res.json())
            .then((res) => {
              const courseCategory = res.feed.title['$t'];
              const entries = res.feed.entry;
              
              return parseData(courseCategory, entries, titleField, codeField);
            })
            .catch((err) => console.log(err))
        );
      });
    });

    Promise.all(fetches).then((dataArray) => {
      const allData = dataArray.reduce((prevData, curData) => {
        return mergeData(prevData, curData);
      });
      db.insertCourseData(sourceSchool, allData)
        .catch((err) => console.log(err));
    });    
  } else {
    return null;
  }
}

module.exports = {
  getData,
};