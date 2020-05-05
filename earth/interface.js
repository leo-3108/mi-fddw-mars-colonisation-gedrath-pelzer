/**
 * Earth-Interface
 * 
 * - Weiterleitung der Daten aus dem Mars-Netz in das Erd-Netz
 * - Simulation eines Delays
 */

// config
const config_mars = require('../_config/config.mars.json')
const config_earth = require('../_config/config.mars.json')

// packages
const amqp = require('amqplib')
const logging = require('logging')
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

// create process objects
const output = logging.default('Earth-Interface')
const mars = amqp.connect(config_mars.amqp.url)
const earth = amqp.connect(config_earth.amqp.url)


// start process
earth.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // incoming messages
    const earth_comm_exch = await channel.assertExchange(config_earth.amqp.exch.comm, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started Earth-Interface - To exit press CTRL+C")

        // listen to communication exchange
        channel.bindQueue(q.queue, earth_comm_exch.exchange, '#.normal')

        // consume
        channel.consume(q.queue, message => {

            output.info('Message Received – Wait for 3 Secs')

            // waiting simulates the travel time from earth to mars
            setTimeoutPromise(60 * 3).then(async () => {

                // connect to mars
                await mars.then(mars_connection => {
                    return mars_connection.createChannel()
                }).then(async mars_channel => {

                    const mars_comm_exch = await channel.assertExchange(config_mars.amqp.exch.comm, 'topic', {
                        durable: false
                    })

                    if (mars_channel.publish(mars_comm_exch.exchange, message.fields.routingKey, message.content))
                        output.info("✅ Sent data to Mars 👽 from " + message.fields.exchange)
                    else
                        output.error("Error accourd while sending data to Brocker")


                }).catch(err => {
                    throw err
                })
            })
        })

    }).catch(err => {
        throw err
    })
}).catch(err => {
    throw err
})