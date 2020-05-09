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
        channel.bindQueue(q.queue, api_aggr_exch.exchange, '#.normal');

        // consume
        channel.consume(q.queue, async message => {

            if (!message.content)
                return

            let payload = JSON.parse(message.content.toString())

            channel.publish(enduser_exch.exchange, message.fields.routingKey, Buffer.from(
                JSON.stringify(NASA_Insight(payload))
            ))

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
 * Weather Forecast for the next 3 days
 * 
 * Converts the NASA API into readable Text for the User
 * TRICK: The Data is seen as Weather-Forecast not as the current weather
 * 
 * @param {Object} paylpoad JSON-Object that comes from Earth
 */
const NASA_Insight = (paylpoad) => {
    let output = {
        title: "Weather-Report",
        data: []
    }

    let sol_days = paylpad.sol_keys

    // get the first three dates
    for (let i = 0; i < 3; i++) {
        output.data[i] = {
            date: sol_days[i],
            dateUTC: paylpoad[sol_days[i]].First_UTC,
            season: paylpoad[sol_days[i]].Season,
            temp_high: paylpoad[sol_days[i]].AT.mx,
            temp_low: paylpoad[sol_days[i]].AT.mn,
            wind: paylpoad[sol_days[i]].HWS.av,
            pressure: paylpoad[sol_days[i]].PRE.av,
        }
        
    }

    return output
}