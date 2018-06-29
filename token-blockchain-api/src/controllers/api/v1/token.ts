import { Controller, Get, PathParams, Required } from 'ts-express-decorators';
import { Summary, Description } from 'ts-express-decorators/swagger';
import { BadRequest } from 'ts-httpexceptions';
import { W3 } from 'soltsice';
import { EthService } from '../../../services/EthService';

@Controller('/token')
export class TokenController {

    constructor(private eth: EthService) { }

    @Get('/supply')
    async getTokenSupply(): Promise<string> {
        return (await this.eth.token.totalSupply()).toFixed(0);
    }

    @Summary('BDrain token balance in wei (1e-18')
    @Description('BDrain token balance')
    @Get('/balance/:contract')
    async getTokenBalance( @Required() @PathParams('contract') contract: string): Promise<string> {
        if (W3.isValidAddress(contract)) {
            return (await this.eth.token.balanceOf(contract)).toFixed(0);
        } else {
            throw new BadRequest(`Invalid wallet address: ${contract}`);
        }
    }
}
