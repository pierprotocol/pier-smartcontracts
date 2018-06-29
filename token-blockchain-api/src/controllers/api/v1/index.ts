import { EthController } from './eth';
import { TokenController } from './token';

import { Controller, Get } from 'ts-express-decorators';

@Controller('/status')
export class StatusController {
    @Get('/')
    async ethStatus() {
        const result = {
            success: true,
            app: 'avalanchain-blockchain-api'
        };
        return result;
    }
}

export default [EthController, TokenController, StatusController];
