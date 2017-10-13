import logger from 'lib/logger';
import Google from 'services/google';
import PowerDNS from 'services/powerdns';

function findRecord(rec, records) {
    for (const r of records) {
        if (rec.name === r.name && rec.type === r.type && rec.value === r.value) {
            return r;
        }
    }
}

function getDifList(rec1, rec2) {
    const difList = [];

    if (rec1.ttl !== rec2.ttl)
        difList.push('ttl');
    if (rec1.comment.account !== rec2.comment.account || rec1.comment.content !== rec2.comment.content)
        difList.push('comment');

    return difList;
}

function getRelatedRecords(record, records) {
    const result = records.reduce((res, rec) => {
        if (record.name === rec.name && record.type === rec.type) {
            res.push(rec);
        }

        return res;
    }, []);

    console.log(result.length);

    return result.length ? result : null;
}

async function makeTasks(zonesPD, zonesGS) {
    const tasksPD = [];
    const tasksGS = [];
    if (!zonesPD || !zonesGS)
        throw Error('zonesPD or/and zonesGS is/are not defined');

    for (const zonePD of zonesPD) {
        let zoneGS;
        const zoneId = zonePD.id;

        for (const z of zonesGS) {
            if (z.id === zoneId) {
                zoneGS = z;
                break;
            }
        }

        if (!zoneGS) throw Error(`GS hasn't ${zoneId} zone`);

        for (const recPD of zonePD.records) {
            const recGS = findRecord(recPD, zoneGS.records);
            const relatedRecords = getRelatedRecords(recPD, zonePD.records);

            if (recGS) {
                const difList = getDifList(recPD, recGS);

                if (!difList.length)
                    continue;

                const composedRec = {
                    name:  recPD.name,
                    value: recPD.value,
                    type:  recPD.type,
                    ttl:   recPD.ttl,
                    comment: {
                        account: recGS.comment.account || '',
                        content: recGS.comment.content || ''
                    }
                };

                if (difList.includes('ttl')) {
                    tasksGS.push({
                        type: 'update',
                        data: {
                            zoneId,
                            record: composedRec,
                        },
                    }, relatedRecords);
                }

                if (difList.includes('comment')) {
                    tasksPD.push({
                        type: 'update',
                        data: {
                            zoneId,
                            record: composedRec,
                        },
                    }, relatedRecords);
                }
            } else {
                console.log('add GS:', recPD);
                tasksGS.push({
                    type: 'add',
                    data: {
                        zoneId,
                        record: {
                            name:  recPD.name,
                            value: recPD.value,
                            type:  recPD.type,
                            ttl:   recPD.ttl,
                            comment: {
                                account: recPD.comment.account || '',
                                content: recPD.comment.content || '',
                            }
                        },
                    },
                }, relatedRecords);
            }
        }

        for (const recGS of zoneGS.records) {
            if (!findRecord(recGS, zonePD.records)) {
                tasksGS.push({
                    type: 'delete',
                    data: {
                        zoneId,
                        record: recGS,
                    },
                });
            }
        }
    }

    return { tasksGS, tasksPD }
}

async function sync() {
    /**
     * 1. Load zones from PD
     */
    const zonesPD = await PowerDNS.getZones();
    logger.info(`Load zones from PD: Success`);
    /**
     * 2. Load zones from GS
     */
    const google = await Google.build();
    const zonesGS = await google.getZones();
    logger.info(`Load zones from GS: Success`);

    /**
     * 3. Compare
     */
    const { tasksPD, tasksGS } = await makeTasks(zonesPD, zonesGS);
    logger.info(`Compare zones: Success`);

    /**
     * 4. Update GS
     */
    for (const task of tasksGS) {
        await google.doTask(task);
    }
    logger.info(`Update GS: Success`);

    /**
     * 5. Update PD
     */
    for (const task of tasksPD) {
        await PowerDNS.doTask(task);
    }
    logger.info(`Update PD: Success`);
}

export default sync;
