var amqp = require('amqplib/callback_api');
var config = require('../_config/config.mars.json')
const logging = require('logging')

const output = logging.default('Aggregator')

var bucket = {}

amqp.connect(config.amqp.url, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        //Daten empfangen
        var aggregator_exch = config.amqp.exch.sensor_aggr
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

            // Get Data
            channel.consume(q.queue, async (message) => {
                output.info('Get data from ' + message.fields.routingKey + ' - ' + message.content);
                
                let topics = sensor_topics(message.fields.routingKey)

                if (bucket[topics.room] == null) {
                    bucket[topics.room] = {
                        temperature: null,
                        humidity: null
                    }
                }

                bucket[topics.room][topics.type] = JSON.parse(message.content.toString())

                await sendToClients(channel, enduser_exch, topics).catch(err => {
                    output.error('@sendToClients', err)
                })

            }, {
                noAck: true
            });
        });
    });
})

/**
 * Sendet die veränderten Daten gesammelt zu allen Clients, wenn alle
 * Monitore ihren Daten zu einem Ort versendet haben
 *
 * @module distributer
 * @version 1.0
 * 
 * @param {Channel} channel 
 * @param {AssertExchange} exch 
 * @param {Object} topics Orignial Topics 
 */
const sendToClients = async (channel, exch, topics) => {
    if (bucket[topics.room].temperature != null && bucket[topics.room].humidity != null) {

        await channel.publish(
            exch,
            `sensor.${topics.room}.normal`,
            Buffer.from(JSON.stringify(
                changeData(
                    bucket[topics.room].temperature,
                    bucket[topics.room].humidity,
                    topics.room
                )
            ))
        )

        output.info("✅ Send new message to Enduser")
        delete bucket[topics.room]

    } else {
        output.warn("Not enough data to send to Enduser", bucket)
        return
    }
}

/**
 * Verändert die Daten entsprechend der Anwendungslogik
 * 
 * @module distributer
 * @version 1.0
 * 
 * @param {Object} humidity Luftfeuchtigkeits-Sensor
 * @param {Object} temperature Temperatur-Sensor
 * 
 * @return {Object} Verändertes Object
 */
const changeData = (humidity, temperature, room) => {
    output.info("Changed Data")
    return {
        "meta": {
            "info": "Ihre Sensor-Daten für Raum " + room
        },
        "humidity": humidity,
        "temperatur": temperature
    }
}

/**
 * Spaltet die Monitoring-Topics in ihre entsprechende Wörter
 * 
 * @module distributer
 * @version 0.1
 * 
 * @param {Object} routing_key Verwendete Topics der Nachricht 
 *  
 * @return {Object} Wörter aufgespaltet in `type`, `place`, `status`
 */
const sensor_topics = (routing_key) => {
    let array = routing_key.split('.')

    return {
        from: array[0],
        room: array[1],
        type: array[2],
        status: array[3]
    }
}