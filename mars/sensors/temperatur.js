const sensor = require('./sensor')

var getRandom = (min, max) => Math.random() * (max - min) + min

sensor.start(() => {getRandom(23, 25)}, 'labor', 'temperatur', 1)

