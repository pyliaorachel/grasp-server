const firebase = require("firebase");

const config = {
  apiKey: "AIzaSyAVn9pWmvSoOHA6bmrF0dTpCOp-U2WeQO0",
  authDomain: "grasp-f7f86.firebaseapp.com",
  databaseURL: "https://grasp-f7f86.firebaseio.com",
  storageBucket: "grasp-f7f86.appspot.com",
  messagingSenderId: "611627396388"
};
const fbApp = firebase.initializeApp(config);
const db = fbApp.database();

function insertSchoolCourseData(sourceSchool, data) {
  return firebase.database().ref().child(`course/${sourceSchool}`).update(data);
}

function insertCourseData(sourceSchool, courseCategory, courseCode, data) {
  return firebase.database().ref().child(`course/${sourceSchool}/${courseCategory}/${courseCode}`).update(data);
}

module.exports = {
  insertSchoolCourseData,
  insertCourseData,
};