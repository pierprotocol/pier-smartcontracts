'use strict';

import { Server } from './server';

export const start = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        const apiServer = new Server();
        apiServer.start()
            .then(resolve)
            .catch(reject);

        const graceful = () => {
            apiServer.stop().then(() => process.exit(0));
        };

        // Stop graceful
        process.on('SIGTERM', graceful);
        process.on('SIGINT', graceful);
    });
};