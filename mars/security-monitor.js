var amqp = require('amqplib/callback_api');
var config = require('../_config/config.mars.json')
const logging = require('logging')

const output = logging.default('Security-Monitor')

amqp.connect(config.amqp.url, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        //SensorDaten
        var exchsensor = config.amqp.exch.sensor;
        channel.assertExchange(exchsensor, 'topic', {
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

            output.info('Waiting for data - To exit press CTRL+C')

            channel.bindQueue(q.queue, exchsensor, '#');

            channel.consume(q.queue, function (msg) {
                output.info('Get data from ' + msg.fields.routingKey + ' - ' + msg.content);

                if (msg.content <= 20.5 || msg.content >= 24.5) {
                    senderror(msg.fields.routingKey, msg.content, channel, exchenduser)
                }
                else {
                    senddata(msg.fields.routingKey, msg.content, channel, exchenduser)
                }

            }, {
                noAck: true
            });
        });
    });

    const okay = logging.default('🟢')
    const error = logging.default('🔴')

    function senddata(key, content, channel, exchenduser) {
        //Code zum weiterleiten
        channel.publish(exchenduser, key, Buffer.from(content));
        okay.info('Sent data - ' + key);
    }

    function senderror(key, content, channel, exchenduser) {
        //Code zum Senden einer Warnung
        var keytmp = key.split('.')

        channel.publish(exchenduser, keytmp[0] + '.' + keytmp[1] + '.' + keytmp[2] + '.error', Buffer.from(content));
        error.info('Sent error - ' + keytmp[0] + '.' + keytmp[1] + '.' + keytmp[2] + '.error');
    }
})
