/**
 * Modules for the monitor.js
 * 
 * @module monitor
 * @version 0.1
 */
var config = require('../../_config/config.earth.json')
var amqplib = require('amqplib')
var fetch = require('node-fetch')

/**
 * Starts Monitoring on an specific Resource
 * 
 * @module monitor
 * @version 0.1
 * 
 * @param {String} key Name for the Monitor (=> This has implication on Topics for the config.amqp-Protocol)
 * @param {String => String} fetch_uri Function on how to build the URI
 * @param {String => String} fetch_options Extra Options for the fetch
 * @param {String} host URL of the Host for Logging
 * @param {Integer} interval Time between each fetch in Seconds
 * 
 * @see https://www.npmjs.com/package/node-fetch
 * @see https://www.npmjs.com/package/config.amqplib
 */
exports.start = (key = '', fetch_uri = (place) => '', fetch_options = (place) => '', host = '', places = [], interval = 10) => {

    const logger = require('logging').default(key + 'API')

    logger.info(`Started monitoring for ${key}API - To exit press CTRL+C`)

    var open = amqplib.connect(config.amqp.url)

    open.then(connection => {
        return connection.createChannel()
    }).then(async channel => {

        const api_exch = await channel.assertExchange(config.amqp.exch.apis, 'topic', {
            durable: false
        })

        const request = async () => {
            for (place of places) {
                let pattern = place.toLowerCase()

                // Getting Data from API
                await fetch(fetch_uri(place), fetch_options(place)).then(res => {
                    // Check for HTTP-Error
                    if (res.ok) {
                        return res;
                    } else {
                        // Convert to String
                        logger.warn("Failed fetching data from API through HTTP-Error-Code", res.status, res.statusText)
                        channel.publish(api_exch.exchange, pattern + '.error', Buffer.from(`Failed fetching data from ${key}API through HTTP-Error-Code` + res.status))

                        throw res
                    }
                }).then(res => {
                    // Convert to String
                    logger.info("Fetched data from", host, "-", place)
                    return res.text()
                }).then(text => {
                    // Send to Brocker
                    if (channel.publish(api_exch.exchange, pattern + '.normal', Buffer.from(text)))
                        logger.info("Sent data to Brocker")
                    else
                        logger.error("Error accourd while sending data to Brocker")
                }).catch(err => {
                    // Catch Errors
                    logger.error("Error accourd while fetching data: ", err)
                })
            }
        }

        // Start sending the request every $interval seconds
        await request()
        setInterval(async () => {
            await request()
        }, interval * 1000)

    }).catch(err => {
        throw err
    })
}

