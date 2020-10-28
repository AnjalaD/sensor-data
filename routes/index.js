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

function calcMean(val, n) {
  return val / n;
}

function calcSD(val, val2, n) {
  return (val2 - (val * 2) / n) / n;
}

const fields = ["m_hmd", "m_lit", "m_prs", "m_tmp", "sd_hmd", "sd_lit", "sd_prs", "sd_tmp"];


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
      const processed = {};
      fields.forEach(field => processed[field] = []);

      results.forEach(row => {
        const timeMilli = moment(row.collected).unix();
        const timeStr = moment(row.collected).format("MMM DD hh:mm");

        fields.forEach(field => processed[field].push({
          x: timeMilli,
          y: row[field],
          label: timeStr,
        }));
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
        const { counter, humidity, humidity2, light, light2, pressure, pressure2, temperature, temperature2 } = element;
        processed = `(
          "${date.toISOString()}",
          ${calcMean(humidity, counter)},
          ${calcMean(light, counter)},
          ${calcMean(pressure, counter)},
          ${calcMean(temperature, counter)}),
          ${calcSD(humidity, humidity2, counter)},
          ${calcSD(light, light2, counter)},
          ${calcSD(pressure, pressure2, counter)},
          ${calcSD(temperature, temperature2, counter)},
          ${processed}`;
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
  const query = `INSERT INTO data(collected,${fields.join(",")}) VALUES ${processed}; `;
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
  const query = 'drop database if exists `sensor-data`;'
    + 'create database `sensor-data`;'
    + 'use `sensor-data`;'
    + 'SET GLOBAL sql_mode = "NO_ENGINE_SUBSTITUTION";'
    + 'set global time_zone = "+05:30";'
    + 'create table data('
    + 'id int primary key auto_increment,'
    + 'm_hmd double,'
    + 'm_lit double,'
    + 'm_prs double,'
    + 'm_tmp double,'
    + 'sd_hmd double,'
    + 'sd_lit double,'
    + 'sd_prs double,'
    + 'sd_tmp double,'
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
  const query = `INSERT INTO data(collected,${fields.join(",")}) VALUES("${new Date().toISOString()}", 75, 100, 1, 26, 1, 1, 1, 1);`;
  const action = () => {
    res.status(200);
    res.send();
  }
  runSql(config, query, action);
});

module.exports = router;
