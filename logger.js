const winston = require('winston');

const {
  timestamp, combine, json, errors,
} = winston.format;

const logger = winston.createLogger({
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json(),
  ),
  transports: [
    new winston.transports.File({
      filename: 'logging.log',
      maxsize: 20000000,
    }),
  ],
});

module.exports = logger;
