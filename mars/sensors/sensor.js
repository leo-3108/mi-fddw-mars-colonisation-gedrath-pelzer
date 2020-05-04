/** 
 * Default function for sending Sensor Data
 */
var config = require('../../_config/config.mars.json')
const amqplib = require('amqplib')
const logging = require('logging')

exports.start = (getdata, room, type, id, interval = 3) => {

    const output = logging.default(room + '.' + type + '.' + id)

    output.info('Started monitoring for ' + room + '.' + id + ' - To exit press CTRL+C')

    var open = amqplib.connect(config.amqp.url)

    open.then(connection => {
        return connection.createChannel()
    }).then(channel => {

        channel.assertExchange(config.amqp.exch.sensor, 'topic', {
            durable: false
        }).then(exch => {

            // Start sending the request every $interval seconds
            setInterval(async () => {
                let data = getdata().toString()
                if (channel.publish(exch.exchange, room + '.' + type + '.' + id + '.normal', Buffer.from(data)))
                    output.info("✅ Sent Sensor data to Brocker – " + data)
                else
                    output.error("Error accourd while sending data to Brocker")

            }, interval * 1000)

        }).catch(err => {
            throw err
        })

    }).catch(err => {
        throw err
    })
}
