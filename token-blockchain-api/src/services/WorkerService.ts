import { Service } from 'ts-express-decorators';
import * as winston from 'winston';
import { Server } from '../server';
import { config, Pipe } from './../config';
import { JsonRPCRequest, JsonRPCResponse, JsonRPCError } from '../models/rpc';
import * as SQS from 'aws-sdk/clients/sqs';
import { EthService } from '../services';
import { ApproveWorkRequest, ApproveWorkResponse } from '../models';

interface PipeWithQueues extends Pipe {
    reader: SQS;
    writer: SQS;
}

/** Async background workers that every second checks if it has work available */
@Service()
export class WorkerService {

    // NOTE
    // Node is single-threaded only for the main event loop,
    // but it handles IO on many other threads
    // if we ensure that worker functions never blocks then performing
    // background work is no different than serving multiple requests
    // and the web api remains responsive

    private logger: winston.LoggerInstance = Server.logger;

    private queues: PipeWithQueues[] = [];
    private pendingRequests: { [id: string]: (response: JsonRPCResponse) => void } = {};
    private testing: boolean = false;

    constructor(private eth: EthService) { // TODO logger must be created before middleware, no it is null here when injected,  @Inject(LoggerInstance) private logger: winston.LoggerInstance
        if (config.sqs && config.sqs.pipes && config.sqs.pipes.length > 0) {
            let options = {
                region: config.sqs.region || process.env.AWS_REGION || 'us-east-1',
                accessKeyId: config.sqs.access_key,
                secretAccessKey: config.sqs.access_key_secret
            };

            for (let p of config.sqs.pipes) {
                let qwp: PipeWithQueues = p as PipeWithQueues;
                qwp.reader = new SQS(options);
                qwp.writer = new SQS(options);
                this.queues.push(qwp);
                // let other services to set up
                // setTimeout(() => {
                //     this.pollQueue(qwp);
                // }, 1000);

            }
        }

        // TESTING
        if (this.testing) {
            setTimeout(async () => {
                try {
                    await new Promise<void>((resolve, reject) => {
                        this.queues[0].reader.purgeQueue({ QueueUrl: config.sqs.pipes[0].in }, (err, res) => {
                            if (err) {
                                console.log('CANNOT PURGE READER');
                                reject(err);
                            } else {
                                resolve();
                                // this.queueWriter.purgeQueue({ QueueUrl: config.sqs.writer_url }, (err1, res1) => {
                                //     if (err1) {
                                //         console.log('CANNOT PURGE WRITER');
                                //         reject(err1);
                                //     } else {
                                //         resolve();
                                //     }
                                // });
                            }
                        });
                    });
                    // tslint:disable-next-line:no-empty
                } catch { }
                let started = Date.now();
                setInterval(async () => {
                    // try {
                    //     await promise;
                    //     // tslint:disable-next-line:no-empty
                    // } catch { }
                    await this.sendPingBatch();
                    let delta = Date.now() - started;
                    console.log('SENT: ' + this.sentCount + ' (' + (this.sentCount / (delta / 1000)) + ') RECEIVED: ' + this.receiveCount + ' (' + (this.receiveCount / (delta / 1000)) + ')');

                }, 500);
            }, 2000);
        }
    }

    public sentCount: number = 0;
    public receiveCount: number = 0;

    public async sendPingBatch() {
        for (let i = 0; i < 10; i++) {
            if (this.sentCount % 2 === 0) {
                // console.log('SENDING ping_async REQUEST');
                let request = new JsonRPCRequest('pingAsync', [this.sentCount]);
                this.sendRequest(this.queues[0], request).then(response => {
                    this.sentCount++;
                    if (!response || !response.result) {
                        console.log('ASYNC REQUEST ERROR: ', response);
                    } else {
                        this.receiveCount++;
                        if (response.result === 'pong: ' + this.sentCount) {
                            // console.log('ASYNC REQUEST CORRECT RESULT: ', response.result);
                        } else {
                            // console.log('ASYNC REQUEST WRONG RESULT: ', response.result);
                        }
                    }
                }).catch(err => {
                    console.log('CANNOT SEND SYNC REQUEST: ', err);
                });
            } else {
                // console.log('SENDING ping REQUEST');
                let request = new JsonRPCRequest('ping', [this.sentCount]);
                this.sendRequest(this.queues[0], request).then(response => {
                    this.sentCount++;
                    if (!response || !response.result) {
                        console.log('SYNC REQUEST ERROR: ', response);
                    } else {
                        this.receiveCount++;
                        if (response.result === 'pong: ' + this.sentCount) {
                            // console.log('SYNC REQUEST CORRECT RESULT: ', response.result);
                        } else {
                            // console.log('SYNC REQUEST WRONG RESULT: ', response.result);
                        }
                    }
                }).catch(err => {
                    console.log('CANNOT SEND ASYNC REQUEST: ', err);
                });
            }
        }
    }

    private async sendQueueMessage(pipe: PipeWithQueues, data: JsonRPCResponse | JsonRPCRequest) {
        return new Promise<SQS.SendMessageResult>((resolve, reject) => {
            pipe.writer.sendMessage(
                {
                    QueueUrl: this.testing ? config.sqs.pipes[0].in : pipe.out,
                    MessageBody: JSON.stringify(data)
                },
                (err, res) => {
                    if (err) {
                        console.log('SEND ERROR: ', err);
                        reject(err);
                    }
                    resolve(res);
                });
        });
    }

    private async sendRequest(pipe: PipeWithQueues, request: JsonRPCRequest): Promise<JsonRPCResponse> {
        let promise = new Promise<JsonRPCResponse>(async (resolve, reject) => {
            if (pipe.writer) {
                try {
                    if (request.id) {
                        this.pendingRequests[request.id + ''] = resolve;
                    }
                    await this.sendQueueMessage(pipe, request);
                } catch (err) {
                    reject(err);
                }
            } else {
                this.logger.error('Trying to send RPC request without SQS being set up.');
                reject('SQS queue is not set up');
            }
        });
        return promise;
    }

    /** Process message queue from tasks backend */
    private async pollQueue(pipe: PipeWithQueues) {
        // this.logger.debug('Polling a queue in background.');
        if (pipe.reader) {
            let params: SQS.Types.ReceiveMessageRequest = {
                QueueUrl: pipe.in,
                WaitTimeSeconds: 20,
                MaxNumberOfMessages: 10
            };
            pipe.reader.receiveMessage(params, async (err, res) => {
                if (err) {
                    this.logger.error('Error during polling queue, waiting 5 seconds to try again.', err);
                    setTimeout(() => {
                        this.pollQueue(pipe);
                    }, 5000);
                } else {
                    if (res.Messages) {
                        res.Messages.forEach(message => {
                            // do not await
                            this.processMessage(pipe, message);
                        });
                    } else {
                        this.logger.info('No queue messages');
                    }
                    // recursively call, should use long polling (WaitTimeSeconds: 20)
                    setImmediate(() => {
                        this.pollQueue(pipe);
                    });
                }
            });

        } else {
            this.logger.error('SQS service is not set up, cannot read messages.');
        }
    }

    private async processMessage(pipe: PipeWithQueues, message: SQS.Types.Message) {
        let data = JSON.parse(message.Body);
        let deleteMessage = () => pipe.reader.deleteMessage(
            {
                QueueUrl: pipe.in,
                ReceiptHandle: message.ReceiptHandle
            }, (err, deleteResult) => {
                if (err) {
                    this.logger.error('Cannot delete processed queue message', err);
                }
            });
        if (!(data && data.jsonrpc && (data.jsonrpc === '2.0'))) {
            deleteMessage();
            this.logger.warn('NON-RPC MESSAGE FROM QUEUE: ', data);
            // do not delete it, probably it is for something else, or could use as system messages
        } else {
            if (data.method) {
                // console.log('Processing RPC request: ', data);
                let request = data as JsonRPCRequest;

                // NB it is tempting to move all RPC method to a separate service, but just don't do this
                // Queue RPC is for our own purposes and the mere fact of receiving a message indicates
                // that the sender is properly authorized on AWS. We resolve a function by method name,
                // do not even try to put internal calls in the same resolution scope and users' RPC calls
                let f = (this as any)[request.method];

                if (!f) {
                    this.logger.warning('RPC METHOD NOT IMPLEMENTED: ', request.method);
                    let error = new JsonRPCError(404, 'RPC METHOD NOT IMPLEMENTED: ' + request.method);
                    let response = new JsonRPCResponse(request.id, undefined, error);
                    try {
                        await this.sendQueueMessage(pipe, response);
                        deleteMessage();
                    } catch (err) {
                        this.logger.error('Cannot send queue message', err);
                    }
                } else {
                    if (!request.id) {
                        // Notification
                        f.call(this, ...request.params);
                        deleteMessage();
                    } else {
                        // console.log('Found RPC handler: ', request.method, f);
                        let response: JsonRPCResponse;
                        try {
                            let result1 = f.call(this, ...request.params);
                            let result = (result1 instanceof Promise) ? await result1 : result1;
                            // console.log('METHOD RESULT: ', result);
                            response = new JsonRPCResponse(request.id, result);
                        } catch (err) {
                            console.log('Cannot process queue message', request, err);
                            // this.logger.error('Cannot process queue message', request, err);
                            let code = (err && err.code) ? err.code : 500;
                            let error = new JsonRPCError(code, 'Cannot process queue message', err);
                            response = new JsonRPCResponse(request.id, undefined, error);
                        }
                        try {
                            await this.sendQueueMessage(pipe, response);
                            // if we die here, a message will be reprocessed later
                            // all processing must be idempotent
                            deleteMessage();
                        } catch (err) {
                            this.logger.error('Cannot send queue message', err);
                        }
                    }
                }
            } else {
                // console.log('Processing RPC response: ', data);
                let response = data as JsonRPCResponse;
                let resolver = this.pendingRequests[response.id + ''];
                if (resolver) {
                    try {
                        resolver(response);
                        // resolver was invoked without errors, delete it and the message
                        delete this.pendingRequests[response.id + ''];
                        deleteMessage();
                    } catch (err) {
                        this.logger.error('Response resolver error', response, err);
                    }
                } else {
                    this.logger.error('Unexpected response', response);
                    deleteMessage();
                }
            }
        }
    }

    public ping(message: string) {
        return 'pong: ' + message;
    }

    public pingAsync(message: string) {
        return Promise.resolve('pong: ' + message);
    }

    // Note that these method are exact copy of methods in Eth controller without decorators

    // async approveWork(request: ApproveWorkRequest): Promise<ApproveWorkResponse> {
    //     return this.eth.approveWork(request);
    // }

    async approveWorkAsync(request: ApproveWorkRequest): Promise<ApproveWorkResponse> {
        return this.eth.approveWorkAsync(request);
    }

    // async approveWorkResult(txHash: string): Promise<ApproveWorkResponse> {
    //     return this.eth.approveWorkResult(txHash);
    // }
}
