var monitor = require('./monitor').start;
var config = require('../../_config/config.earth.json')

monitor(
    'NASA',
    (place) => config.apis.nasa.url + '?api_key=' + config.apis.nasa.api_key + '&feedtype=json&ver=1.0',
    () => {},
    config.services.traffic.host,
    [
        'mars'
    ]
)