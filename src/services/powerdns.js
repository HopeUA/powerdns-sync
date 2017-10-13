import logger from 'lib/logger';
import fetch from 'node-fetch'
import Config from 'config';

async function getZones() {
    const response = await fetch(`${Config.get('powerdns.zoneList')}`, {
        method: 'GET',
        headers: { "X-Api-Key": Config.get('powerdns.api-key') },
    });

    const result = await response.json();

    return result.map(zone => ({
        id:  zone.id,
        url: `${Config.get('powerdns.zoneList')}/${zone.id}`,
    }));
}

async function getRecords(zone) {
    const response = await fetch(zone.url, {
        method:  'GET',
        headers: { "X-Api-Key": Config.get('powerdns.api-key') },
    });
    const result = await response.json();
    const records = [];

    for (const rrset of result.rrsets) {
        for (const rec of rrset.records) {
            const newRec = {
                name:    rrset.name,
                value:   rec.content,
                type:    rrset.type,
                ttl:     `${rrset.ttl}`,
                comment: rrset.comments[0] ? {
                    content: rrset.comments[0].content,
                    account: rrset.comments[0].account,
                } : {}
            };
            records.push(newRec);
        }
    }

    return records;
}

async function updateRecord(data) {
    const { records, zoneId } = data;
    const recs = records.map((rec, idx, arr) => arr.length - 1 > idx ? `
        {
            "content":  "${rec.value}",
            "disabled": false
        },
    ` : `
        {
            "content":  "${rec.value}",
            "disabled": false
        }
    `);
    return await fetch(`${Config.get('powerdns.zoneList')}/${zoneId}`, {
        method: 'PATCH',
        headers: { "X-Api-Key": Config.get('powerdns.api-key') },
        body: `
        {
            "rrsets": [{
                "changetype": "REPLACE",
        
                "name": "${records[0].name}",
                "type": "${records[0].type}",
                "ttl":  ${records[0].ttl},
                "records": [
                    {
                        "content":  "${record.value}",
                        "disabled": false
                    }
                ],
                
                "comments": [{
                    "content": "${record.comment.content}",
                    "account": "${record.comment.account}"
                }]
            }]
        }`,
    });
}

class PowerDNS {
    static async doTask(task) {
        const taskDescription = `[${task.data.record.name} ${task.data.record.type}]`;

        switch (task.type) {
            case 'update':
                logger.info(`PD (update) ${taskDescription}: Start`);
                try {
                    const res = await updateRecord(task.data);
                    if (res.ok) {
                        logger.info(`PD (update): Success`);
                    } else {
                        logger.error(`PD (update): Fail. ${res.status} ${res.statusText}`);
                    }
                } catch (e) {
                    logger.error(`PD (update) error: ${e.stack}`);
                }
                logger.info(`PD (update): Success`);
                break;
        }
    }

    static async getZones() {
        const zones = await getZones();
        const table = [];

        for(const z of zones) {
            const newZone = { id: z.id };
            newZone.records = await getRecords(z);
            table.push(newZone);
        }

        return table;
    }
}

export default PowerDNS;
