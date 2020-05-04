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
const logger = require('logging').default('Client')
const fs = require('fs').promises
const uuid = require('uuid').v1
const readline = require('readline')

amqp.connect(config.amqp.url, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        //Empfangen der Sensor-Daten
        channel.assertExchange(config.amqp.exch.sensor, 'topic', {
            durable: false
        });

        //Empfangen der Fehlermeldungen
        channel.assertExchange(config.amqp.exch.aggregator, 'topic', {
            durable: false
        });

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
    });
})