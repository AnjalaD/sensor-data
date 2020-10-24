create database `sensor-data`;
use `sensor-data`;
set global time_zone = '+05:30';
create table data (
	id int primary key auto_increment,
    temp double,
    humidity double,
    pressure double,
    light double,
    collected datetime,
    received timestamp
);