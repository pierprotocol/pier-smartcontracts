import { ServerLoader, ServerSettings, Inject, GlobalAcceptMimesMiddleware } from 'ts-express-decorators';
import path = require('path');
import * as Express from 'express';
import * as winston from 'winston';
import * as cors from 'cors';
// import * as jwt2 from 'jsonwebtoken';
import { config } from './config';
import 'ts-express-decorators/swagger';

let rootDir = path.resolve(__dirname);

let mount: any = {};
mount[config.api.prefix] = [`${rootDir}/controllers/**/**.ts`, `${rootDir}/controllers/**/**.js`];

@ServerSettings({
    rootDir,
    mount,
    componentsScan: [
        `${rootDir}/services/**/**.ts`,
        `${rootDir}/services/**/**.js`
    ],
    acceptMimes: ['application/json'],
    port: process.env.PORT || config.api.port || 5001,
    httpsPort: false,
    serveStatic: {
        '/': path.join(__dirname, 'public')
    },
    swagger: {
        path: '/api/v1'
    }
})
export class Server extends ServerLoader {

    static logger: winston.LoggerInstance;

    public $onInit(): void {

        Server.logger = new (winston.Logger)({
            level: 'debug',
            transports: [
                new (winston.transports.Console)({
                    // json: true,
                    timestamp: () => {
                        return (new Date()).toISOString();
                    },

                    formatter: (options: any) => {
                        let data = {
                            time: options.timestamp(),
                            level: options.level,
                            msg: undefined !== options.message ? options.message : ''
                        };
                        if (options.meta.hasOwnProperty('json')) {
                            data = { ...data, ...options.meta.json };
                        }
                        return JSON.stringify(data);
                    }
                })
            ],
        });
    }

    /**
     * This method let you configure the middleware required by your application to works.
     * @returns {Server}
     */
    @Inject()
    async $onMountingMiddlewares(): Promise<any> {

        // tslint:disable-next-line:one-variable-per-declaration
        const morgan = require('morgan'),
            cookieParser = require('cookie-parser'),
            bodyParser = require('body-parser'),
            compress = require('compression'),
            methodOverride = require('method-override');

        this
            .use(morgan('dev'))
            .use(GlobalAcceptMimesMiddleware)
            .use(cookieParser())
            .use(compress({}))
            .use(methodOverride())
            .use(bodyParser.json())
            .use(bodyParser.urlencoded({
                extended: true
            }));

        this.expressApp.use(cors());

        // NB do not use arrow function, `this.` will be wrong
        // tslint:disable:only-arrow-functions
        // tslint:disable-next-line:space-before-function-paren
        this.expressApp.use(function (req, res, next) {
            let origEndHandler = res.end;
            // tslint:disable-next-line:space-before-function-paren
            res.end = function () {
                res.end = origEndHandler;
                res.emit('end');
                res.end.apply(this, arguments);
            };
            next();
        });

        this.expressApp.use((req, res, next) => {
            let startAt = process.hrtime();
            res.on('end', () => {
                let diff = process.hrtime(startAt);
                let time = Math.round(diff[0] * 1e3 + diff[1] * 1e-6 * 100) / 100;
                Server.logger.info(
                    'request', {
                        json: {
                            method: req.method,
                            url: req.url,
                            status: res.statusCode,
                            response_time: time,
                            content_length: res.get('content-length'),
                            remote_addr: req.headers['x-forwarded-for'] || req.connection.remoteAddress
                        }
                    }
                );
            });
            next();
        });

        return null;
    }

    public $onAuth(request: Express.Request, response: Express.Response, next: Express.NextFunction, authorization?: any): void {
        if (request.user) {
            next();
        } else {
            response.status(401).send({ error: 'Unauthenticated' });
        }
    }

    $afterRoutesInit(): void | Promise<any> {

        this.expressApp.use(Express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
        // fallback to index.html if in SPA pressed Ctrl+F5
        this.expressApp.use((req, res, next) => {
            res.sendFile(path.join(__dirname, './public/index.html'));
        });
        return null;
    }

    $onReady() {
        // disable built-in logger
        // $log.shutdown();
        Server.logger.debug('Server initialized');
    }

    $onServerInitError(error: any): any {
        console.log('HERE', error);
        Server.logger.error('Server encounter an error =>', error);
    }

    public stop() {
        return new Promise<void>(async (resolve, reject) => {
            try {
                this.httpServer.close(() => {
                    resolve();
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}
