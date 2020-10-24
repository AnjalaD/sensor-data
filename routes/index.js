var express = require('express');
var router = express.Router();
var moment = require('moment');

var mysql = require('mysql');
const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

function runSql(config, query, action) {
  console.log(query);
  const connection = mysql.createConnection(config);
  connection.connect();
  connection.query(
    query,
    function (err, results) {
      if (err) console.error(err.message);
      else action(results);
    })
  connection.end();
}


/* GET home page. */
router.get('/:date?', function (req, res) {
  let date;
  if (req.params.date) {
    date = req.params.date;
  } else {
    date = moment().format("YYYY-MM-DD")
  }
  const query = `SELECT * FROM data WHERE DATE(collected)="${date}" ORDER BY collected;`;
  const action = (results) => {
    if (results) {
      console.log(results);
      var processed = {
        temp: [],
        humidity: [],
        pressure: [],
        light: [],
      }
      results.forEach(({ id, temp, humidity, pressure, light, collected }) => {
        const timeMilli = moment(collected).unix();
        const timeStr = moment(collected).format("MMM DD hh:mm");
        processed.temp.push({ x: timeMilli, y: temp, label: timeStr });
        processed.humidity.push({ x: timeMilli, y: humidity, label: timeStr });
        processed.pressure.push({ x: timeMilli, y: pressure, label: timeStr });
        processed.light.push({ x: timeMilli, y: light, label: timeStr });
      });
      res.render('index', { date, data: processed });
    }
  }

  runSql(config, query, action);
});


// store data received from sensors
router.post('/push', function (req, res) {
  const values = req.body.params.value;
  let processed = "";
  try {
    if (Array.isArray(values)) {
      const date = moment();
      values.reverse();
      values.forEach((element) => {
        const { humidity, temperature, light } = element;
        processed = `("${date.toISOString()}", ${humidity}, ${light}, NULL, ${temperature}), ${processed}`;
        date.subtract({ minutes: process.env.INTERVAL || 1 });
      });
    } else {
      const { humidity, temperature, light } = values;
      processed = `("${moment().toISOString()}", ${humidity}, ${light} , NULL, ${temperature});`;
    }
  } catch (e) {
    console.error(e);
  }
  processed = processed.slice(0, -1);
  const query = `INSERT INTO data(collected, humidity, light, pressure, temp) VALUES ${processed}; `;
  const action = () => {
    res.status(200);
    res.send();
  }
  runSql(config, query, action);
});


// init-database
router.get("/init-db", function (req, res) {
  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  };
  const connection = mysql.createConnection(config);
  connection.connect();
  const query = 'drop sensor-data if exists;'
    + 'create database `sensor - data`;'
    + 'use `sensor - data`;'
    + 'SET GLOBAL sql_mode = "NO_ENGINE_SUBSTITUTION";'
    + 'set global time_zone = "+05:30";'
    + 'create table data('
    + 'id int primary key auto_increment,'
    + 'temp double,'
    + 'humidity double,'
    + 'pressure double,'
    + 'light double,'
    + 'collected datetime,'
    + 'received timestamp'
    + ');';
  const action = () => {
    res.status(200);
    res.send();
  }
  runSql(config, query, action);
});

// store data received from sensors
router.get('/test-push', function (req, res) {
  const connection = mysql.createConnection(config);
  connection.connect();
  const query = `INSERT INTO data(collected, humidity, light, pressure, temp) VALUES("${new Date().toISOString()}", 75, 100, 1, 26); `;
  const action = () => {
    res.status(200);
    res.send();
  }
  runSql(config, query, action);
});

module.exports = router;
