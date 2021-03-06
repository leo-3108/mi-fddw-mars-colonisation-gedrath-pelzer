var amqp = require('amqplib/callback_api');
var config = require('../_config/config.mars.json')
const logging = require('logging')

const output = logging.default('Security-Monitor')
const okay = logging.default('🟢')
const error = logging.default('🔴')

output.info('Waiting for data - To exit press CTRL+C')

amqp.connect(config.amqp.url, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        // Sensor-Daten empfangen
        var sensor_exch = config.amqp.exch.sensor
        channel.assertExchange(sensor_exch, 'topic', {
            durable: false
        });

        //Fehlermeldungen senden
        var enduser_exch = config.amqp.exch.enduser
        channel.assertExchange(enduser_exch, 'topic', {
            durable: false
        });

        //Daten weiterleiten
        var aggregator_exch = config.amqp.exch.sensor_aggr
        channel.assertExchange(aggregator_exch, 'topic', {
            durable: false
        });

        channel.assertQueue('', {
            exclusive: true
        }, function (error2, q) {
            if (error2) {
                throw error2;
            }

            channel.bindQueue(q.queue, sensor_exch, '#');

            channel.consume(q.queue, function (msg) {
                output.info('Get data from ' + msg.fields.routingKey + ' - ' + msg.content);

                var keytmp = msg.fields.routingKey.split('.')

                if (keytmp[2] == 'temperature') {
                    if (msg.content <= config.sensors.temperature.min || msg.content >= config.sensors.temperature.max)
                        senderror(msg.fields.routingKey, msg.content, channel, enduser_exch)

                    senddata(msg.fields.routingKey, msg.content, channel, aggregator_exch)
                }

                if (keytmp[2] == 'humidity') {
                    if (msg.content <= config.sensors.humidity.min || msg.content >= config.sensors.humidity.max)
                        senderror(msg.fields.routingKey, msg.content, channel, enduser_exch)

                    senddata(msg.fields.routingKey, msg.content, channel, aggregator_exch)
                }

            }, {
                noAck: true
            });
        });
    });

    function senddata(key, content, channel, exchange) {
        //Code zum weiterleiten

        channel.publish(exchange, key, Buffer.from(content));
        okay.info('Sent data - ' + key);
    }

    function senderror(key, content, channel, exchange) {
        //Code zum Senden einer Warnung
        var keytmp = key.split('.')

        channel.publish(exchange, 'sensor' + '.' + keytmp[1] + '.error', Buffer.from(content));
        error.info('Sent error - ' + 'sensor' + '.' + keytmp[1] + '.error');
    }
})