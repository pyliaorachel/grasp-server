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
          'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/2/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/3/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/4/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1syT_lw98qsCk9T_jvJWSCerpKGXdBpeD55sRXSJJroA/5/public/values?alt=json',
        ],
        titleField: 'gsx$coursetitle',
        codeField: 'title',
      },
      taiwanCCData: {
        urls: [
          // 'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/4/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/5/public/values?alt=json',
          // 'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/6/public/values?alt=json',
          'https://spreadsheets.google.com/feeds/list/1wiiuuI68-cu2mk_wmnl0KoDro0B0bt75Bwl3auBquAc/7/public/values?alt=json',
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
        comments.push({
          text: comment,
        });
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

function getComments(sourceSchool, courseType) {
  return new Promise((resolve, reject) => {
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
          resolve(mergeData(prevData, curData));
        });
        db.insertSchoolCourseData(sourceSchool, allData)
          .catch((err) => console.log(err));
      });    
    } else {
      return null;
    }
  });
}

function updateSentimentData(sourceSchool, courseCategory, courseCode, data) {
  let comments = data.comments;
  const title = data.title;

  Promise.all(comments.map((commentObj) => translationApi.getTranslation(commentObj.text)))
    .then(res => {
      if (res.length) {
        Promise.all(res.map((data, i) => {
          if (data.data) {
            const translatedText = data.data.translations[0].translatedText;
            const lang = data.data.translations[0].detectedSourceLanguage;

            comments[i]['lang'] = lang;

            return sentimentApi.getSentiment(translatedText);            
          }
          return null;
        }))
          .then((sentimentData) => {
            if (sentimentData) {

              const sentimentStatistics = sentimentData.reduce((prevSum, curData, i) => {
                prevSum.score += curData.documentSentiment.score;
                prevSum.magnitude += curData.documentSentiment.magnitude;

                comments[i]['sentiment'] = curData.documentSentiment;

                const sentences = curData.sentences;
                sentences.forEach((sentence) => {
                  const text = sentence.text.content.toLowerCase();
                  if (text.indexOf('professor') != -1 || text.indexOf('teacher') != -1) {
                    prevSum.professor.count++;
                    prevSum.professor.score += sentence.sentiment.score;
                    prevSum.professor.magnitude += sentence.sentiment.magnitude;
                  }
                  if (text.indexOf('workload') != -1) {
                    prevSum.workload.count++;
                    prevSum.workload.score += sentence.sentiment.score;
                    prevSum.workload.magnitude += sentence.sentiment.magnitude;
                  }
                  if (text.indexOf('grade') != -1) {
                    prevSum.grade.count++;
                    prevSum.grade.score += sentence.sentiment.score;
                    prevSum.grade.magnitude += sentence.sentiment.magnitude;
                  }     
                });

                return prevSum;
              }, { 
                score: 0, 
                magnitude: 0, 
                professor: { score: 0, magnitude: 0, count: 0 },
                workload: { score: 0, magnitude: 0, count: 0 },
                grade: { score: 0, magnitude: 0, count: 0 },
              });

              const numOfComments = comments.length;
              sentimentStatistics.score = parseFloat(sentimentStatistics.score) / numOfComments;
              sentimentStatistics.magnitude = parseFloat(sentimentStatistics.magnitude) / numOfComments;
              if (sentimentStatistics.professor.count) {
                sentimentStatistics.professor.score = parseFloat(sentimentStatistics.professor.score) / sentimentStatistics.professor.count;
                sentimentStatistics.professor.magnitude = parseFloat(sentimentStatistics.professor.magnitude) / sentimentStatistics.professor.count;
              }
              if (sentimentStatistics.workload.count) {
                sentimentStatistics.workload.score = parseFloat(sentimentStatistics.workload.score) / sentimentStatistics.workload.count;
                sentimentStatistics.workload.magnitude = parseFloat(sentimentStatistics.workload.magnitude) / sentimentStatistics.workload.count;
              }
              if (sentimentStatistics.grade.count) {
                sentimentStatistics.grade.score = parseFloat(sentimentStatistics.grade.score) / sentimentStatistics.grade.count;
                sentimentStatistics.grade.magnitude = parseFloat(sentimentStatistics.grade.magnitude) / sentimentStatistics.grade.count;
              }
            
              db.insertCourseData(sourceSchool, courseCategory, courseCode, {
                sentimentStatistics,
                comments,
                title,
              });
            }
          });
      }      
    })
    .catch(err => console.log(err));
}

module.exports = {
  getComments,
  updateSentimentData,
};