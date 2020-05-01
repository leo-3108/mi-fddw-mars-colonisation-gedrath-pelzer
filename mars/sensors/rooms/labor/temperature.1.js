var amqp = require('amqplib/callback_api');
var config = require('../../../../_config/config.mars.json')

//------
let sensorroom = 'labor'
let sensortype = 'temperature'
let sensorid = 1
//------

senddata()

function getTemperature() {
    var data = Math.random() * 10
    return data
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
                    let data = await getTemperature()
                    channel.publish(exchange, sensorroom + '.' + sensortype + '.' + sensorid, Buffer.from(data.toExponential));
                    console.log(" [sensor] " + sensorroom + '.' + sensortype + '.' + sensorid + " sent data: " + data);
                }
                getdata()
            }, 3000)
        })
    });
}
