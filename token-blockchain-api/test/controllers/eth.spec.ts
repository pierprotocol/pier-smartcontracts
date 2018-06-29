'use strict';

import 'mocha';
import * as chai from 'chai';
import { ExpressApplication, RouteService } from 'ts-express-decorators'; // RouteService
import { inject, Done, bootstrap } from 'ts-express-decorators/testing';
import { Server } from '../../src/server';
import { EthService } from '../../src/services/EthService';
import { DbService } from '../../src/services/DbService';
import * as SuperTest from 'supertest';
import { SoltsiceContract } from 'soltsice';
import { ApproveWorkRequest } from '../../src/models/index';

const expect = chai.expect;

SoltsiceContract.Silent = true;

describe('blockchain-api tests', () => {

    beforeEach(bootstrap(Server));

    describe('Routes', () => {
        it('should provide a catalog containing the exposed paths', inject([RouteService], (routeService: RouteService) => {
            expect(routeService.getAll().map(r => r.url)).to.include.members([
                '/bc-api/v1/eth/approveWorkAsync',
                '/bc-api/v1/eth/wallet',
                '/bc-api/v1/token/balance/:contract',
            ]);
        }));
    });

    describe('/bc-api/v1/eth/approveWorkAsync', () => {
        it('/bc-api/v1/eth/approveWorkAsync', inject([ExpressApplication, EthService, Done],
            async (expressApplication: ExpressApplication, ethService: EthService, done: Done) => {

                await ethService.initialized;
                let firstBalance: number;

                for (let i = 0; i < 1; i++) {

                    SuperTest(expressApplication)
                        .post('/bc-api/v1/eth/approveWorkAsync')
                        .send({ workerAddress: '0x53bA716751Ca18245F5b357149c9fE85148B9867', projectId: 'a', amount: '1000' })
                        .expect(200)
                        .end((err, response: any) => {
                            let balance = +response.body.balance;
                            console.log('BALANCE', balance);
                            if (i === 0) {
                                firstBalance = balance;
                            } else {
                                expect(balance - firstBalance).to.equal(i * 1000);
                            }
                            done();
                        });
                }

            }));

        it('should loop over approve work', inject([EthService, Done], async (ethService: EthService, done: Done) => {
            let request = new ApproveWorkRequest();
            request.workerAddress = '0x53bA716751Ca18245F5b357149c9fE85148B9867';
            request.amount = 1000;
            request.projectId = 'default';

            await ethService.initialized;
            let firstBalance: number;

            // 22448.841ms for 1000, or 45 tx/sec
            console.time('approveWork');
            for (let i = 0; i < 1; i++) {

                let response = await ethService.approveWorkAsync(request);
                // console.log('BALANCE', response.balance);
                if (i === 0) {
                    firstBalance = +response.balance;
                } else {
                    expect(+response.balance - firstBalance).to.equal(i * 1000);
                }
            }
            console.timeEnd('approveWork');
            done();

        }));

    });

    it('Should return bot address', inject([ExpressApplication, EthService, Done], async (expressApplication: ExpressApplication, ethService: EthService, done: Done) => {
        await ethService.initialized;
        SuperTest(expressApplication)
            .get('/bc-api/v1/eth/address')
            .expect(200)
            .end(async (err, response: any) => {
                if (err) {
                    throw (err);
                }

                let expected = ethService.botAddress;
                console.log('EXPECTED : ', expected);
                console.log('ACTUAL: ', response.text);
                expect(response.text).to.equal(expected);

                done();
            });
    }));

});
