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
const fs = require('fs').promises
const uuid = require('uuid').v1
const readline = require('readline')

// create process objects
const clientID = uuid()
const output = logging.default('Client')
const open = amqplib.connect(config.amqp.url)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


// start process
open.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // Empfangen der Sensor-Daten
    const security_exch = await channel.assertExchange(config.amqp.exch.security, 'topic', {
        durable: false
    })

    // Empfangen der Fehlermeldungen
    const aggregator_exch = await channel.assertExchange(config.amqp.exch.aggregator, 'topic', {
        durable: false
    })

    // Subscribing
    const subs_exch = await channel.assertExchange(config.amqp.exch.subs, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
            exclusive: true
    }).then((q) => {
        output.info("Started Client", clientID, "- To exit press CTRL+C")
        output.info("[i] To Subscribe to a place write   's {place}'")
        output.info("[i] To Desubscribe to a place write 'd {place}'")

        // listen everything from security
        channel.bindQueue(q.queue, security_exch.exchange, '#');

        // consume
        channel.consume(q.queue, async message => {
            if (message.content) {
                await saveData(message.content.toString())
                logger.info(message.fields.routingKey, "-", 'Saved Data to File')
            }
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

/**
 * Schreibt die Daten in eine clientID spezifische Datei
 * @param {String} message Nachricht, die abgespeichert werden soll
 */
const saveData = (message) => fs.appendFile(
    'mars/client/data.' + clientID + '.json',
    message + "\n"
)

const subscribe = async (channel, queue, subs_exch, enduser_exch, place) => {
    // send message to system
    await channel.publish(
        subs_exch.exchange,
        'subscribe',
        Buffer.from(JSON.stringify({
            "place": place,
            "clientID": clientID
        }))
    )

    // look for new topic
    channel.bindQueue(queue, enduser_exch.exchange, place + '.normal')

    logger.info(`[√] Subscribed to: ${place}`);
}

const desubscribe = async (channel, queue, subs_exch, enduser_exch, place) => {
    // send message to system
    await channel.publish(
        subs_exch.exchange,
        'desubscribe',
        Buffer.from(JSON.stringify({
            "place": place,
            "clientID": clientID
        }))
    )

    // stop looking for topic
    channel.unbindQueue(queue, enduser_exch.exchange, place + '.normal')

    logger.info(`[X] Desubscribed from: ${place}`);
}