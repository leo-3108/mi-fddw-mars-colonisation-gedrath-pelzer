/**
 * Earth-Interface
 * 
 * - Weiterleitung der Daten aus dem Mars-Netz in das Erd-Netz
 * - Simulation eines Delays
 */

// config
const config_mars = require('../_config/config.mars.json')
const config_earth = require('../_config/config.earth.json')

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

    const earth_comm_exch = await channel.assertExchange(config_earth.amqp.exch.comm, 'topic', {
        durable: false
    })

    const earth_api_exch = await channel.assertExchange(config_earth.amqp.exch.apis, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started Earth-Interface - To exit press CTRL+C")

        // listen to communication exchange
        channel.bindQueue(q.queue, earth_comm_exch.exchange, '#.normal')

        // listen to api exchange
        channel.bindQueue(q.queue, earth_api_exch.exchange, '#.normal')

        // consume
        channel.consume(q.queue, message => {

            output.info('Message Received – Wait for 3 Secs', message.fields.exchange)

            // waiting simulates the travel time from earth to mars
            setTimeoutPromise(1000 * 3).then(async () => {

                // connect to mars
                await mars.then(mars_connection => {
                    return mars_connection.createChannel()
                }).then(async mars_channel => {

                    const mars_enduser_exch = await channel.assertExchange(config_mars.amqp.exch.enduser, 'topic', {
                        durable: false
                    })

                    let routingKey = earth_comm_topics(message.fields.routingKey)
                    let new_routingKey = message.fields.routingKey

                    // Change Routing Key akkording to type
                    if (message.fields.exchange == earth_comm_exch.exchange){
                        new_routingKey = `earth.message.${routingKey.address}`
                    }
                    else if (message.fields.exchange == earth_api_exch.exchange) {
                        new_routingKey = `sensor.${routingKey.address}.normal`
                    }

                    // send message
                    if (mars_channel.publish(mars_enduser_exch.exchange, new_routingKey, message.content))
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

/**
 * Wandelt die Topics aus dem Enduser exchange um
 * @param {String} routing_key Topic der Nachricht
 * 
 * @return {Object} Jedes Attribut der Nachricht ist ein Topic 
 */
const earth_comm_topics = (routing_key) => {
    let array = routing_key.split('.')

    return {
        address: array[0],
        status: array[0],
        keys: array
    }
}