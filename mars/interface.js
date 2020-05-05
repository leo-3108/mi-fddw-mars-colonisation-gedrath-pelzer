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

// create process objects
const output = logging.default('Mars-Interface')
const mars = amqp.connect(config.amqp.url)
const earth = amqp.connect(config.amqp.url)


// start process
mars.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // incoming messages
    const enduser_exch = await channel.assertExchange(config.amqp.exch.enduser, 'topic', {
        durable: false
    })

    // establish own queue
    await channel.assertQueue('', {
        exclusive: true
    }).then((q) => {
        output.info("Started Mars-Interface - To exit press CTRL+C")
        
        // listen to communication exchange


    }).catch(err => {
        throw err
    })
}).catch(err => {
    throw err
})
