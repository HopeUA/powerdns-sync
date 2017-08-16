import winston from 'winston';
import chalk from 'chalk';
import moment from 'moment';

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: () => {
                return `${chalk.bold(moment().format('YYYY-MM-DD'))}`
                    + ` `
                    + `${chalk.bold(moment().format('HH:mm:ss'))}`;
            },
            formatter: (options) => {
                let level = `[${options.level.toUpperCase()}]`;
                switch (level) {
                    case '[INFO]':
                        level = chalk.green(level);
                        break;
                    case '[ERROR]':
                        level = chalk.red(level);
                        break;
                    default:
                }

                /* eslint-disable prefer-template */
                return `${options.timestamp()} ${level} `
                    + (typeof options.message !== 'undefined' ? options.message : '')
                    + (options.meta && Object.keys(options.meta).length ? `\n\t${JSON.stringify(options.meta)}` : '');
                /* eslint-enable prefer-template */
            }
        })
    ]
});

export default logger;
