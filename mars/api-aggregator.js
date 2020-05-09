/**
 * Client des Mars (Es kann sich hier um einen Raum oder Astronauten)
 * 
 * - Zu bestimmten Messdaten von Räumen (de-)abbonieren
 * - Abbonierte Messdaten empfangen
 * - Kritische Warnmeldungen zu allen Räumen empfangen
 * - Mit spezifischem Client auf der Erde kommunizieren.
 */

// config
const config = require('../../_config/config.mars.json')

// packages
const amqp = require('amqplib')
const logging = require('logging')

// create process objects
const output = logging.default('API-Aggregator')
const open = amqp.connect(config.amqp.url)


// start process
open.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // incoming messages
    const enduser_exch = await channel.assertExchange(config.amqp.exch.enduser, 'topic', {
        durable: false
    })

    // communication
    const api_aggr_exch = await channel.assertExchange(config.amqp.exch.api_aggr, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started API-Aggregator - To exit press CTRL+C")

        // listen everything with critical info
        channel.bindQueue(q.queue, enduser_exch.exchange, '#.normal');

        // consume
        channel.consume(q.queue, async message => {
            let routing_key = enduser_topics(message.fields.routingKey)

            if (!message.content)
                return

            let payload = JSON.parse(message.content.toString())

        }, {
            // automatic acknowledgment mode,
            // see https://www.rabbitmq.com/confirms.html for details
            noAck: true
        })


    }).catch(err => {
        throw err
    })
}).catch(err => {
    throw err
})