var amqp = require('amqplib/callback_api');
var config = require('../_config/config.mars.json')
const logging = require('logging')

const output = logging.default('Aggregator')

amqp.connect(config.amqp.url, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        //Daten empfangen
        var aggregator_exch = config.amqp.exch.aggregator;
        channel.assertExchange(aggregator_exch, 'topic', {
            durable: false
        });

        //Daten senden
        var enduser_exch = config.amqp.exch.enduser;
        channel.assertExchange(enduser_exch, 'topic', {
            durable: false
        });

        channel.assertQueue('', {
            exclusive: true
        }, function (error2, q) {
            if (error2) {
                throw error2;
            }

            output.info('Waiting for data - To exit press CTRL+C')

            channel.bindQueue(q.queue, aggregator_exch, '#');

            var data = [['labor', 'temperature', 0], ['labor', 'humidity', 0]]

            const saveData = (room, sensortyp, value) => {
                if (data[0][0] == room && data[0][1] == sensortyp) {
                    data[0].pop()
                    data[0].push(value)
                }

                if (data[1][0] == room && data[1][1] == sensortyp) {
                    data[1].pop()
                    data[1].push(value)
                }


            }

            channel.consume(q.queue, function (msg) {
                output.info('Get data from ' + msg.fields.routingKey + ' - ' + msg.content);
                msgtmp = msg.fields.routingKey.split('.')

                saveData(msgtmp[1], msgtmp[2], msg.content.toString())

                if (data[0][2] != 0 && data[1][2] != 0) {
                    senddata(msg.fields.routingKey, data, channel, enduser_exch)
                }
            }, {
                noAck: true
            });
        });
    });

    function senddata(key, content, channel, exchange) {
        //Code zum Senden der Daten
        var keytmp = key.split('.')

        channel.publish(exchange, 'sensor' + '.' + keytmp[1] + '.normal', Buffer.from(content));
        output.info('Sent data - ' + 'sensor' + '.' + keytmp[1] + '.normal');
        output.info(content)
    }
})