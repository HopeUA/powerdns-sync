import logger from 'lib/logger';
import * as taskHandlers from './google-tasks';
import GoogleSpreadsheet from 'google-spreadsheet';
import Config from 'config';
import Promise from 'bluebird';

/**
 * Tasks
 */
async function addRecord(data, doc) {
    const { record, zoneId } = data;
    const worksheet = await getWorksheetByZoneId(doc, zoneId);
    const newRow = {
        type:    record.type,
        record:  record.name,
        value:   record.value,
        ttl:     record.ttl,
        comment: record.comment.content,
        owner:   record.comment.account
    };

    await worksheet.addRowAsync(newRow);
}

async function updateRecord(data, doc) {
    const { record, zoneId } = data;
    const rows = await getRows(doc, zoneId);
    const row = await findRow(record, rows);

    row.value = record.value;
    row.ttl = record.ttl;

    await row.saveAsync();
}

async function deleteRecord(data, doc) {
    const { record, zoneId } = data;
    const rows = await getRows(doc, zoneId);
    const row = await findRow(record, rows);

    await row.delAsync();
}

function areEqual(record, row) {
    return record.name === row.record && record.type === row.type && record.value === row.value;
}

async function findRow(record, rows) {
    for (const row of rows) {
        if (areEqual(record, row)) {
            return Promise.promisifyAll(row);
        }
    }
}

function parseZoneIdFromTitle(title) {
    const resArr = /(D:) *(.+)/g.exec(title);

    return {
        flag:   resArr[1],
        zoneId: `${resArr[2]}.`
    }
}

async function getWorksheetByZoneId(doc, id) {
    const worksheets = await getWorksheets(doc);

    for (const w of worksheets) {
        const { zoneId, flag } = parseZoneIdFromTitle(w.title);
        if (!flag) continue;
        if (zoneId === id)
            return Promise.promisifyAll(w);
    }
}

async function getRows(doc, zoneId) {
    const w = await getWorksheetByZoneId(doc, zoneId);
    return w.getRowsAsync({ offset: 2 });
}

async function getWorksheets(doc) {
    const info = await doc.getInfoAsync();

    return info.worksheets;
}

/**
 * default exported class
 */
class Google {
    constructor(doc) {
        if (typeof doc === 'undefined') {
            throw new Error('Cannot be called directly');
        }
        this.doc = doc;
    }

    static async build() {
        const doc = Promise.promisifyAll(
            new GoogleSpreadsheet(Config.get('google.sheet.spreadsheetId'))
        );

        const creds = {
            client_email: Config.get('google.clientEmail'),
            private_key: Config.get('google.privateKey')
        };

        await doc.useServiceAccountAuthAsync(creds);

        return new Google(doc);
    }

    async doTask(task) {
        const taskDescForLog = `[${task.data.record.name} ${task.data.record.type}]`;

        switch (task.type) {
            case 'add':
                logger.info(`GS (add) ${taskDescForLog}: Start`);
                try {
                    await addRecord(task.data, this.doc);
                } catch (e) {
                    logger.error(`GS (add) error: ${e.stack}`);
                }
                logger.info(`GS (add): Success`);
                break;

            case 'delete':
                logger.info(`GS (delete) ${taskDescForLog}: Start`);
                try {
                    await deleteRecord(task.data, this.doc);
                } catch (e) {
                    logger.error(`GS (delete) error: ${e.stack}`);
                }
                logger.info(`GS (delete): Success`);
                break;

            case 'update':
                logger.info(`GS (update) ${taskDescForLog}: Start`);
                try {
                    await updateRecord(task.data, this.doc);
                } catch (e) {
                    logger.error(`GS (update) error: ${e.stack}`);
                }
                logger.info(`GS (update): Success`);
                break;
        }
    }

    async getZones() {
        const worksheets = await getWorksheets(this.doc);
        const table = [];

        for (const w of worksheets) {
            const { zoneId, flag } = parseZoneIdFromTitle(w.title);

            if (!flag) continue;

            const tmpZone = { id: zoneId, records: [] };
            const rows = await getRows(this.doc, zoneId);

            for (const row of rows) {
                if (row.type) {
                    tmpZone.records.push({
                        type:    row.type,
                        name:    row.record,
                        value:   row.value,
                        ttl:     row.ttl,
                        comment: {
                            content: row.comment,
                            account: row.owner
                        },
                    });
                }
            }
            table.push(tmpZone);
        }

        return table;
    }
}

export default Google;
