var amqp = require('amqplib/callback_api');
var config = require('../_config/config.mars.json')

amqp.connect(config.amqp.url, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        //Empfangen der Daten
        var exchange = 'aggregated-data';
        channel.assertExchange(exchange, 'topic', {
            durable: false
        });

        channel.assertQueue('', {
            exclusive: true
        }, function (error2, q) {
            if (error2) {
                throw error2;
            }
            console.log(' [*] Waiting for data. To exit press CTRL+C');

            channel.bindQueue(q.queue, exchange, '#');

            channel.consume(q.queue, function (msg) {
                console.log(" [x] Get data from " + msg.fields.routingKey);
            }, {
                noAck: true
            });
        });
    });
})