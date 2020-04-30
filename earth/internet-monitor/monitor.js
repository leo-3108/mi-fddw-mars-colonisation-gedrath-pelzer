/**
 * Modules for the monitor.js
 * 
 * @module monitor
 * @version 0.1
 */
var config = require('../../_config/config.earth.json')
var amqplib = require('amqplib')
var fetch = require('node-fetch')
var uuid = require('uuid').v1

const getPlacesFromSubs = (channel, logger) => {
    return channel.assertQueue('', {
        exclusive: true
    }).then(async q => {
        logger.info("\nAsking for relevant Cities...")

        let correlationId = uuid();
        let cities = new Promise((resolve, reject) => {

            channel.sendToQueue(config.amqp.rpcs.subs,
                Buffer.from(''), {
                correlationId: correlationId,
                replyTo: q.queue
            }
            )

            setTimeout(function () {
                reject(new Error('Timeout'))
            }, 500);

            channel.consume(q.queue, message => {
                if (message.properties.correlationId == correlationId) {
                    logger.info("Received Cities")
                    resolve(JSON.parse(message.content.toString()))
                }
            }, {
                noAck: true
            })
        })

        return await cities.catch(err => {
            logger.error('Error while requesting Places:', err)
        })
    })
}

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
exports.start = (key = '', fetch_uri = (place) => '', fetch_options = (place) => '', host = '', interval = 10) => {

    const logger = require('logging').default(key + 'API')

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

                await getPlacesFromSubs(channel, logger).then(places => {
                    if (places == null)
                        return []
                    else
                        return places
                }).then(async places => {

                    logger.info(places)

                    for (place of places) {
                        let pattern = key.toLowerCase() + '.' + place.name.toLowerCase()

                        // Getting Data from API
                        await fetch(fetch_uri(place), fetch_options(place)).then(res => {
                            // Check for HTTP-Error
                            if (res.ok) {
                                return res;
                            } else {
                                // Convert to String
                                logger.warn("Failed fetching data from API through HTTP-Error-Code", res.status, res.statusText)
                                channel.publish(exch.exchange, pattern + '.error', Buffer.from(`Failed fetching data from ${key}API through HTTP-Error-Code` + res.status))

                                throw res
                            }
                        }).then(res => {
                            // Convert to String
                            logger.info("Fetched data from", host, "-", place.name)
                            return res.text()
                        }).then(text => {
                            // Send to Brocker
                            if (channel.publish(exch.exchange, pattern + '.normal', Buffer.from(text)))
                                logger.info("Sent data to Brocker")
                            else
                                logger.error("Error accourd while sending data to Brocker")
                        }).catch(err => {
                            // Catch Errors
                            logger.error("Error accourd while fetching data: ", err)
                        })
                    }
                }).catch(err => {
                    throw err
                })

            }, interval * 1000)

        })

    }).catch(err => {
        throw err
    })
}