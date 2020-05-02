/** 
 * Default function for sending Sensor Data
 */
 var config = require('../../_config/config.mars.json')
const amqplib = require('amqplib')
const loggerModule = require('logger')

exports.start = (data = () => {}, room, type, id, interval = 10) => {

    const logger = loggerModule.default(room + '.' + type + '.' + id)

    logger.info(`Started monitoring for ${key}API - To exit press CTRL+C`)

    var open = amqplib.connect(config.amqp.url)

    open.then(connection => {
        return connection.createChannel()
    }).then(channel => {

        channel.assertExchange(config.amqp.exch.monitor, 'topic', {
            durable: false
        }).then(exch => {

            // Start sending the request every $interval seconds
            setInterval(async () => {

                if (channel.publish(exch.exchange, room + '.' + type + '.' + id + '.normal', Buffer.from(data())))
                    logger.info("✅ Sent Sensor data to Brocker")
                else
                    logger.error("Error accourd while sending data to Brocker")

            }, interval * 1000)

        })

    }).catch(err => {
        throw err
    })
}