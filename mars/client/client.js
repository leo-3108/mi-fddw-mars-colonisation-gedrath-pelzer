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
const fs = require('fs').promises
const uuid = require('uuid').v1
const readline = require('readline')

// create process objects
const clientID = uuid()
const output = logging.default('Client')
const open = amqplib.connect(config.amqp.url)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


// start process
open.then(connection => {
    return connection.createChannel()
}).then(async channel => {

    // Empfangen der Sensor-Daten
    const sensor_exch = await channel.assertExchange(config.amqp.exch.sensor, 'topic', {
        durable: false
    })

    // Empfangen der Fehlermeldungen
    const aggregator_exch = await channel.assertExchange(config.amqp.exch.aggregator, 'topic', {
        durable: false
    })

    channel.assertQueue('', {
        exclusive: true
    }, function (error2, q) {
        if (error2) {
            throw error2;
        }
        console.log(' [*] Waiting for data. To exit press CTRL+C');

        channel.bindQueue(q.queue, exchange1, '#');

        channel.consume(q.queue, function (msg) {
            console.log(" [x] Get data from " + msg.fields.routingKey);
        }, {
            noAck: true
        });
    });
}).catch(err => {
    throw err
})
