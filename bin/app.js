import logger from 'lib/logger';
import sync from 'sync';

logger.info('Sync start');
sync().then(() => {
    logger.info('Sync done');
}).catch((error) => {
    logger.error(`Sync error: ${error.stack}`);
});
