#include <TimedAction.h>
#include <DHT.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

#define DHTTYPE DHT11
#define dht_dpin 2
DHT dht(dht_dpin, DHTTYPE);
const int ldrPin = A0;

const char* ssid = "BELL4G-7DD4";
const char* password = "aaaabbbb";

const String post_url = "http://08eb6bcee7d1.ngrok.io/push";

// keep cached values
float saved[50][8] = {};
int saved_counter = 0;

// keep addition of values stored as
// { humidity , humidity*2, light, light*2, pressure, pressure*2, temp, temp*2 }
float temp[8] = {0, 0, 0, 0, 0, 0, 0, 0};
int temp_counter = 0;

/*
   collect data from sensors
   loop throught this function every 15 seconds
   add collected data to "temp"
*/
void collect_from_sensors() {
  float h = dht.readHumidity();
  Serial.print("Current humidity = ");
  Serial.print(h);
  Serial.print(" %  ");

  float l = float(analogRead(ldrPin));
  l = ((1650 / (l * 0.00322265625)) - 500) / 10;
  Serial.print("Light = ");
  Serial.print(l);
  Serial.print(" lux  ");

  // sensor not implemented
  float p = 0;
  Serial.print("Pressure = ");
  Serial.print(p);
  Serial.print(" Pa  ");

  float t = dht.readTemperature();
  Serial.print("temperature = ");
  Serial.print(t);
  Serial.println(" C  ");

  temp[0] = temp[0] + h;
  temp[1] = temp[1] + h * h;
  temp[2] = temp[2] + l;
  temp[3] = temp[3] + l * l;
  temp[4] = temp[4] + p;
  temp[5] = temp[5] + p * p;
  temp[6] = temp[6] + t;
  temp[7] = temp[7] + t * t;
  temp_counter++;

  delay(15000);
}

/*
   try connect to wifi
*/
void connect_to_wifi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting");
  int retry = 1;
  while (WiFi.status() != WL_CONNECTED && retry <= 10) {
    delay(1000);
    Serial.print(".");
    retry++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Connected to Wifi");
  } else {
    Serial.println("Wifi failed");
    WiFi.disconnect();
  }
}

/*
    send data to server
    throught httpclient as post request
    with body formatted according to CAP v1.2 Protocol
*/
void send_data() {
  if (WiFi.status() != WL_CONNECTED) {
    connect_to_wifi();
  }

  if (WiFi.status() == WL_CONNECTED) {
    // wifi available try sending data
    Serial.println("Sending data to server");
    HTTPClient http;
    http.begin(post_url);
    http.addHeader("Content-Type", "application/xml");
    String body = String("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
                  + "<alert xmlns=\"urn:oasis:names:tc:emergency:cap:1.2\">"
                  + "<identifier>TRI13970876.2</identifier>"
                  + "<sender>trinet@caltech.edu</sender>"
                  + "<sent>2003-06-11T20:56:00-07:00</sent>"
                  + "<status>Actual</status>"
                  + "<msgType>Update</msgType>"
                  + "<scope>Public</scope>";

    for (int i = 0; i < saved_counter; i++) {
      body += String("<info>")
              + "<category>Other</category>"
              + "<event>Update server</event>"
              + "<urgency>Unknown</urgency>"
              + "<severity>Unknown</severity>"
              + "<certainty>Observed</certainty>"
              + "<parameter>"
              + "<valueName>counter</valueName>"
              + "<value>" + String(temp_counter) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>humidity</valueName>"
              + "<value>" + String(saved[i][0]) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>humidity2</valueName>"
              + "<value>" + String(saved[i][1]) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>light</valueName>"
              + "<value>" + String(saved[i][2]) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>light2</valueName>"
              + "<value>" + String(saved[i][3]) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>pressure</valueName>"
              + "<value>" + String(saved[i][4]) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>pressure2</valueName>"
              + "<value>" + String(saved[i][5]) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>temperature</valueName>"
              + "<value>" + String(saved[i][6]) + "</value>"
              + "</parameter>"
              + "<parameter>"
              + "<valueName>temperature2</valueName>"
              + "<value>" + String(saved[i][7]) + "</value>"
              + "</parameter>"
              + "<area>"
              + "<areaDesc>Device location</areaDesc>"
              + "</area>"
              + "</info>";
    }
    body += "</alert>";

    Serial.println(body);
    int res_code = http.POST(body);
    http.end();
    Serial.print("Response Code: ");
    Serial.println(res_code);

    if (res_code == 200) {
      // send data  successful
      // clear saved data
      saved_counter = 0;
    }
  }
  else {
    // wifi unavailable
    Serial.println("Wifi unavailable!");
  }
}

/*
   call every 15 min to send data to server
*/
void action_15() {
  for (int i = 0; i < 8; i++) {
    saved[saved_counter][i] = temp[i];
    temp[i] = 0;
  }
  saved_counter++;
  send_data();
  temp_counter = 0;
}

// TimedAction is used to call action_15 method every 15 minutes
TimedAction timedAction = TimedAction(900000, action_15);

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(ldrPin, INPUT);
  connect_to_wifi();
}
void loop() {
  timedAction.check();
  collect_from_sensors();
}