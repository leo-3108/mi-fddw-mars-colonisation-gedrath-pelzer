var amqp = require('amqplib/callback_api');
var config = require('../_config/config.mars.json')
const logging = require('logging')

const output = logging.default('Security-Monitor')
const okay = logging.default('🟢')
const error = logging.default('🔴')

amqp.connect(config.amqp.url, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        // Sensor-Daten
        const sensor_exch = channel.assertExchange(config.amqp.exch.sensor, 'topic', {
            durable: false
        });

        //Fehlermeldungen
        var exchenduser = config.amqp.exch.enduser;
        channel.assertExchange(exchenduser, 'topic', {
            durable: false
        });

        channel.assertQueue('', {
            exclusive: true
        }, function (error2, q) {
            if (error2) {
                throw error2;
            }
          
            channel.bindQueue(q.queue, sensor_exch.exchange, '#');
          
            channel.consume(q.queue, function (msg) {
                output.info('Get data from ' + msg.fields.routingKey + ' - ' + msg.content);

                if (msg.content <= 20.5 || msg.content >= 24.5) {
                    senderror(msg.fields.routingKey, msg.content, channel, exchenduser)
                }
                else {
                    okay.info('Data okay - ' + msg.fields.routingKey)
                }

            }, {
                noAck: true
            });
        });
    });

    function senderror(key, content, channel, exchenduser) {
        //Code zum Senden einer Warnung
        var keytmp = key.split('.')

        channel.publish(exchenduser, keytmp[0] + '.' + keytmp[1] + '.' + keytmp[2] + '.error', Buffer.from(content));
        error.info('Sent error - ' + keytmp[0] + '.' + keytmp[1] + '.' + keytmp[2] + '.error');
    }
})
