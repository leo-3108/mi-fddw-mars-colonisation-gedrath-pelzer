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
        var exchange1 = 'sensor-data';
        channel.assertExchange(exchange1, 'topic', {
            durable: false
        });

        //Weiterleiten der Daten
        var exchange2 = 'checked-data';
        channel.assertExchange(exchange2, 'topic', {
            durable: false
        });

        //Fehlermeldungen
        var exchange3 = 'error';
        channel.assertExchange(exchange3, 'topic', {
            durable: false
        });

        channel.assertQueue('', {
            exclusive: true
        }, function (error2, q) {
            if (error2) {
                throw error2;
            }
            console.log(' [*] Waiting for data. To exit press CTRL+C');

            channel.bindQueue(q.queue, exchange1, '#');

            channel.consume(q.queue, function (msg) {
                console.log(" [x] Get data from " + msg.fields.routingKey);

                //Anwendungslogik
                //...

                senddata(msg.fields.routingKey, msg.content, channel, exchange2)

            }, {
                noAck: true
            });
        });
    });


    function senddata(key, content, channel, exchange2) {
        //Code zum weiterleiten
        channel.publish(exchange, key, Buffer.from(content));
    }

    function senderror(key, content, channel, exchange3) {
        //Code zum Senden einer Warnung
        channel.publish(exchange, key, Buffer.from(content));
    }
})
