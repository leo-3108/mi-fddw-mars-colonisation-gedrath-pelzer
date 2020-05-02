var amqp = require('amqplib/callback_api');
var config = require('../../../../_config/config.mars.json')

//------
let sensorroom = 'labor'
let sensortype = 'temperature'
let sensorid = 3
//------

senddata()

function getTemperature(min, max) {
    return Math.random() * (max - min) + min;
}

function senddata() {
    //Code zum Senden der Temperatur-Daten

    amqp.connect(config.amqp.url, function (error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
            }

            var exchange = 'sensor-data';

            channel.assertExchange(exchange, 'topic', {
                durable: false
            });

            setInterval(() => {
                async function getdata() {
                    let data = await getTemperature(23, 25)
                    channel.publish(exchange, sensorroom + '.' + sensortype + '.' + sensorid, Buffer.from(data.toExponential));
                    console.log(" [sensor] " + sensorroom + '.' + sensortype + '.' + sensorid + " sent data: " + data);
                }
                getdata()
            }, 5000)
        })
    });
}
