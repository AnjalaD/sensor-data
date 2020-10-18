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

/* GET home page. */
router.get('/', function (req, res) {
  var connection = mysql.createConnection(config);
  connection.connect();
  connection.query('SELECT * FROM data ORDER BY collected;', function (err, results, fields) {
    if (err) throw err

    if (results) {
      console.log(results);
      var processed = {
        temp: [],
        humidity: [],
        pressure: [],
        light: [],
      }
      results.forEach(({ id, temp, humidity, pressure, light, collected }) => {
        collected = new Date(collected).getTime();
        processed.temp.push({ x: collected, y: temp });
        processed.humidity.push({ x: collected, y: humidity });
        processed.pressure.push({ x: collected, y: pressure });
        processed.light.push({ x: collected, y: light });
      });

      res.render('index', { title: 'Sensor Data', data: processed });
    }
  })
  connection.end();

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
        processed = '("' + date.toISOString() + '", ' + humidity + ', ' + light + ', NULL,' + temperature + '),' + processed;
        date.subtract({ seconds: 30 });
      });
    } else {
      const { humidity, temperature, light } = values;
      processed = '("' + moment().toISOString() + '", ' + humidity + ', ' + light + ', NULL, ' + temperature + '),';
    }
  } catch (e) {
    console.error(e);
  }
  processed = processed.slice(0, -1);
  // console.log(values);
  console.log(processed);
  const connection = mysql.createConnection(config);
  connection.connect();
  const query = 'INSERT INTO data (collected, humidity, light, pressure, temp) VALUES' + processed + ';';
  connection.query(
    query,
    function (err) {
      if (err) throw err
    })
  connection.end();

  res.status(200);
  res.send();
});

module.exports = router;
