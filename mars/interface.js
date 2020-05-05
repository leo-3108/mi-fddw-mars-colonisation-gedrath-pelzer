/**
 * Mars-Interface
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
const output = logging.default('Mars-Interface')
const mars = amqp.connect(config_mars.amqp.url)
const earth = amqp.connect(config_earth.amqp.url)


// start process
mars.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // incoming messages
    const mars_comm_exch = await channel.assertExchange(config_mars.amqp.exch.comm, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started Mars-Interface - To exit press CTRL+C")
        
        // listen to communication exchange
        channel.bindQueue(q.queue, mars_comm_exch.exchange, '#.normal')

        // consume
        channel.consume(q.queue, message => {

            output.info('Message Received – Wait for 3 Secs')

            // waiting simulates the travel time from mars to earth
            setTimeoutPromise(60 * 3).then(async () => {

                // connect to earth
                await earth.then(earth_connection => {
                    return earth_connection.createChannel()
                }).then(async earth_channel => {

                    const earth_comm_exch = await channel.assertExchange(config_earth.amqp.exch.comm, 'topic', {
                        durable: false
                    })

                    if (channel.publish(exch.exchange, message.fields.routingKey, message.content))
                        output.info("✅ Sent data to Earth 🌍 from " + message.fields.exchange)
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
