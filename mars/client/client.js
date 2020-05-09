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
const shortid = require('shortid');
const readline = require('readline')

// packe settings
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$');

// create process objects
const clientID = shortid.generate()
const output = logging.default('Mars-Client')
const open = amqp.connect(config.amqp.url)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


// start process
open.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // incoming messages
    const enduser_exch = await channel.assertExchange(config.amqp.exch.enduser, 'topic', {
        durable: false
    })

    // communication
    const comm_exch = await channel.assertExchange(config.amqp.exch.comm, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started Mars-Client", clientID, "- To exit press CTRL+C")
        output.info("[i] To Subscribe to a place write   's {place}'")
        output.info("[i] To Desubscribe to a place write 'd {place}'")
        output.info("[i] To Write a message write        'm {address} {message}'")

        // listen everything with critical info
        channel.bindQueue(q.queue, enduser_exch.exchange, 'sensor.#.error');

        // listen to messages from earth
        channel.bindQueue(q.queue, enduser_exch.exchange, 'earth.message.' + clientID);

        // consume
        channel.consume(q.queue, async message => {
            let routing_key = enduser_topics(message.fields.routingKey)

            if (!message.content)
                return

            let payload = message.content.toString()

            if (routing_key.type == 'sensor') {
                if (routing_key.status == 'error') {
                    output.warn('Kritischer Messwert aus Raum', routing_key.room, '->', payload)
                } else if (routing_key.status == 'normal') {
                    await saveData(message.content.toString())
                    output.info(message.fields.routingKey, "-", 'Saved Data to File')
                }
            } else if (routing_key.type == 'earth.message') {
                let payload = JSON.parse(message.content.toString())
                let date = new Date(payload.timestamp)

                output.info(`📨 ${payload.from} schreibt um ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}\n${payload.text}`)
            }
        }, {
            // automatic acknowledgment mode,
            // see https://www.rabbitmq.com/confirms.html for details
            noAck: true
        })

        // readline
        rl.on('line', input => {
            let tmp = input.split(' ')

            switch (tmp[0]) {
                case 's':
                    subscribe_sensor(channel, q.queue, enduser_exch, tmp[1].toLocaleLowerCase())
                    break;
                case 'd':
                    desubscribe_sensor(channel, q.queue, enduser_exch, tmp[1].toLocaleLowerCase())
                    break;
                case 'm':
                    send_message(channel, comm_exch, tmp[1], tmp.slice(2).join(' '))
                    break;
                default:
                    output.error('First Argument must be one of the following: s, d, m')
            }
        });


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
    'mars/client/data.' + clientID + '.log',
    message + "\n"
)

/**
 * Wandelt die Topics aus dem Enduser exchange um
 * @param {String} routing_key Topic der Nachricht
 * 
 * @return {Object} Jedes Attribut der Nachricht ist ein Topic 
 */
const enduser_topics = (routing_key) => {
    let array = routing_key.split('.')

    switch (array[0]) {
        case 'sensor':
            // sensor data
            return {
                type: array[0],
                    room: array[1],
                    status: array[2],
                    keys: array
            }

            case 'earth':
                // data from earth
                return {
                    type: array[0] + '.' + array[1],
                        address: array[2],
                        keys: array
                }

                default:
                    return {
                        keys: array
                    }
    }
}


/**
 * Abonniert Sensor Daten zu einem bestimmtem Raum
 * 
 * @param {Channel} channel Current AMQP-Channel
 * @param {Queue} queue Own AMQPQueue
 * @param {Exchange} exch AMQP-Exchnage
 * @param {String} room ID of the room that we want to subscibe to
 */
const subscribe_sensor = (channel, queue, exch, room) => {

    // look for new topic
    channel.bindQueue(queue, exch.exchange, 'sensor.' + room + '.normal')

    output.info(`[√] Subscribed to: ${room}`);
}

/**
 * Deabonniert Sensor Daten zu einem bestimmtem Raum
 * 
 * @param {Channel} channel Current AMQP-Channel
 * @param {Queue} queue Own AMQPQueue
 * @param {Exchange} exch AMQP-Exchnage
 * @param {String} room ID of the room that we want to subscibe to
 */
const desubscribe_sensor = (channel, queue, exch, room) => {

    // stop looking for topic
    channel.unbindQueue(queue, exch.exchange, 'sensor.' + room + '.normal')

    output.info(`[X] Desubscribed from: ${room}`);
}

/**
 * Sendet eine Nachricht an die Erde
 * 
 * @param {Channel} channel Current AMQP-Channel
 * @param {Exchange} exch AMQP-Exchnage
 * @param {String} address ID of recipient
 * @param {String} message Message that will be sent to the recipient
 */
const send_message = (channel, exch, address, text) => {

    if (shortid.isValid(address)) {
        // create payload
        let payload = {
            timestamp: Date.now(),
            from: clientID,
            to: address,
            text: text
        }

        // stop looking for topic
        channel.publish(
            exch.exchange,
            address + '.normal',
            Buffer.from(JSON.stringify(payload)))

        output.info(`✅ Send message to: ${address}`);
    } else {
        output.error(`The Address "${address}" doesn't seem to be corret`)
    }
}