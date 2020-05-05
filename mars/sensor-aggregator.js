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

            channel.consume(q.queue, function (msg) {
                output.info('Get data from ' + msg.fields.routingKey + ' - ' + msg.content);

                //Anwendungslogik...

                senddata(msg.fields.routingKey, msg.content, channel, enduser_exch)

            }, {
                noAck: true
            });
        });
    });

    function senddata(key, content, channel, exchange) {
        //Code zum Senden der Daten

        channel.publish(exchange, key, Buffer.from(content));
        output.info('Sent data - ' + key);
    }
})