/**
 * Client auf der Erde
 * 
 * - Mit spezifischem Client auf dem Mars kommunizieren.
 */

// config
const config = require('../_config/config.earth.json')

// packages
const amqp = require('amqplib')
const logging = require('logging')
const shortid = require('shortid');
const readline = require('readline')

// packe settings
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$');

// create process objects
const clientID = shortid.generate()
const output = logging.default('Earth-Client')
const open = amqp.connect(config.amqp.url)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// start process
open.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // communication
    const comm_exch = await channel.assertExchange(config.amqp.exch.comm, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started Earth-Client", clientID, "- To exit press CTRL+C")
        output.info("[i] To Write a message write 'm {address} {message}'")

        // listen to messages from earth
        channel.bindQueue(q.queue, comm_exch.exchange, clientID + '.normal')

        // consume
        channel.consume(q.queue, async message => {

            if (message.content) {
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
                case 'm':
                    send_message(channel, comm_exch, tmp[1], tmp.slice(2).join(' '))
                    break;
                default:
                    output.error('First Argument must be one of the following: s, d')
            }
        });


    }).catch(err => {
        throw err
    })
}).catch(err => {
    throw err
})

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