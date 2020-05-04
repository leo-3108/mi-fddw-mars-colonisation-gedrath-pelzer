const sensor = require('./sensor')

var random = (min, max) => {
    return () => {
        return Math.random() * (min - max) + min
    }
}

sensor.start(random(20, 25), 'labor', 'temperatur', 1)

sensor.start(random(20, 25), 'labor', 'temperatur', 2)

