/**
 * Mars-Interface
 * 
 * - Weiterleitung der Daten aus dem Erd-Netz in das Mars-Netz
 * - Simulation eines Delays
 */

// config
const config = require('../_config/config.mars.json')
const config = require('../_config/config.mars.json')

// packages
const amqp = require('amqplib')
const logging = require('logging')

// create process objects
const output = logging.default('Client')
const open = amqp.connect(config.amqp.url)
