const sensor = require('./sensor')

var args = process.argv.slice(2);

// check if process has been started correctly
if (args.length == 0) {
    console.log("Usage: temperatur.js <room>");
    process.exit(1);
}

/**
 * Erstellet eine Funktion die eine Zufallszahl zurückgibt
 * @param {Number} min Untere Grenze
 * @param {Number} max Obere Grenze
 */
var random = (min, max) => {
    return () => {
        return Math.random() * (max - min) + min
    }
}

// start process
sensor.start(random(20, 25), args.join(' '), 'temperature', 1)

