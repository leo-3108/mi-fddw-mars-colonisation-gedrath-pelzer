var monitor = require('./monitor').start;
var config = require('../../_config/config.earth.json')

monitor(
    'Nasa',
    (place) => config.apis.nasa.url + '?api_key=' + config.apis.nasa.api_key + '&feedtype=json&ver=1.0',
    () => {},
    config.apis.nasa.host,
    [
        'mars'
    ],
    60 * 60 * 12
)