'use strict';

import { start } from './start';

start()
    .catch((err: any) => {
        console.error(`Error starting server: ${err.message}`);
        process.exit(-1);
    });
