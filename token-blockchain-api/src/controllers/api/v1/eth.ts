import { EthService } from '../../../services';
import { Controller, Get, Post, Required, BodyParams, PathParams } from 'ts-express-decorators'; // PathParams,
import { Summary, Returns } from 'ts-express-decorators/swagger'; // Description,
import { ApproveWorkRequest, ApproveWorkResponse } from '../../../models';
import { BadRequest } from 'ts-httpexceptions';
import { W3 } from 'soltsice';

@Controller('/eth')
export class EthController {

    constructor(private eth: EthService) { }

    @Get('/')
    async ethStatus() {
        const network = await this.eth.w3.networkId;
        const result = {
            blockNumber: await this.eth.w3.blockNumber,
            latestTime: await this.eth.w3.latestTime,
            networkId: network,
            web3API: this.eth.w3.web3API,
        };

        return result;
    }

    @Get('/address')
    botAccountAddress(): string {
        return this.eth.botAddress;
    }

    @Summary('Approve work and write to state channel. When amount = 0 it returns current balance on the platform (earned from last anchoring)')
    @Post('/approveWorkAsync')
    @Returns(200, { description: 'Return tx hash for later retrieval', type: ApproveWorkResponse })
    @Returns(403, { description: 'User is not a AC bot' })
    async approveWorkAsync( @BodyParams() @Required() request: ApproveWorkRequest): Promise<ApproveWorkResponse> {
        return this.eth.approveWorkAsync(request);
    }

    @Summary('Withdraw platform balance to token. Returns Tx hash')
    @Post('/withdraw/:contract')
    async getWithdrawTx( @Required() @PathParams('contract') contract: string) {
        if (W3.isValidAddress(contract)) {
            return this.eth.checkoutAccountAsync(contract);
        } else {
            throw new BadRequest(`Invalid worker address: ${contract}`);
        }
    }

    @Summary('Get last worker receipt')
    @Get('/receipt/:contract')
    async getLastReceipt( @Required() @PathParams('contract') contract: string) {
        if (W3.isValidAddress(contract)) {
            return this.eth.getLastReceiptAsync(contract);
        } else {
            throw new BadRequest(`Invalid worker address: ${contract}`);
        }
    }

    @Summary('Get last worker receipt data (e.g. could paste to metamask)')
    @Get('/receiptData/:contract')
    async getLastReceiptData( @Required() @PathParams('contract') contract: string) {
        if (W3.isValidAddress(contract)) {
            return this.eth.getCheckoutDataAsync(contract);
        } else {
            throw new BadRequest(`Invalid worker address: ${contract}`);
        }
    }

    // UTILS

    @Get('/wallet')
    async getGenesisWallet() {
        return this.eth.accountManager.wallet();
    }

    @Get('/manager')
    getAccountManager() {
        return this.eth.accountManager.address;
    }

    @Get('/token')
    async getGenesisToken() {
        return this.eth.accountManager.token();
    }

}
