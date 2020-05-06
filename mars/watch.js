/**
 * Client auf der Erde
 * 
 * - Mit spezifischem Client auf dem Mars kommunizieren.
 */

// config
const config = require('../_config/config.mars.json')

// packages
const amqp = require('amqplib')
const logging = require('logging')
const shortid = require('shortid');
const readline = require('readline')

// packe settings
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$');

// create process objects
const clientID = shortid.generate()
const output = logging.default('Watch@Enduser')
const open = amqp.connect(config.amqp.url)

// start process
open.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // communication
    const enduser = await channel.assertExchange(config.amqp.exch.enduser, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started Watch", clientID, "- To exit press CTRL+C")

        // listen to messages from earth
        channel.bindQueue(q.queue, enduser.exchange, '#')

        // consume
        channel.consume(q.queue, async message => {

            if (message.content) {
                output.info(`${message.fields.routingKey} & ${message.content.toString()}`)
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