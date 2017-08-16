import logger from 'lib/logger';
import Google from 'services/google';

async function sync() {
    /**
     * 1. Load zones from PD
     */
    const zonesPD = [];
    // PD.getZones()

    /**
     * 2. Load zones from GS
     */
    const zonesGS = await Google.getZones();

    /**
     * 3. Compare
     */
    const tasksGS = [];
    const tasksPD = [];

    // [tasksGS, tasksPD] = compare(zonesPD, zonesGS);

    /**
     * 4. Update GS
     */
    for (const task of tasksGS) {
        // await google.doTask(task);
    }

    /**
     * 5. Update PD
     */

}

export default sync;
