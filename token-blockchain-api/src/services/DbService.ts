import { Service } from 'ts-express-decorators';
import * as DB from 'sequelize';
import * as winston from 'winston';
import { Server } from '../server';
import { User } from '../models/user';
import { W3 } from 'soltsice';
import { config } from '../config';

export enum EventType {
    Default = 0,
    Claims = 1
}

@Service()
export class DbService {
    db: DB.Sequelize;
    initialized: Promise<void>;

    eventStoreTableName = 'event_store';
    entityColumn = 'entity';
    eventIdColumn = 'event_id';
    timeStampColumn = 'timestamp';
    payloadColumn = 'payload';

    userTableName = 'user_store';

    accountLedgerStoreTableName = 'account_ledger_store';

    // im-memory cache
    // unbounded memory usage, but 1M users with 1kb = 1Gb, still manageable, by that time code will be rewritten many times
    cache = { events: {} as any, users: {} as any };

    private logger: winston.LoggerInstance = Server.logger;

    constructor() {

        let isTest = process.env.NODE_ENV === 'test';
        let dbName = !isTest ? config.postgres.db : config.postgres.db + '-test';

        this.db = new DB(dbName, config.postgres.user, config.postgres.password, {
            host: config.postgres.host,
            dialect: 'postgres',

            pool: {
                max: 10,
                min: 0,
                idle: 10000
            },
            benchmark: false,
            logging: false
        });

        this.initialized = this.doInit();
    }

    async doInit(): Promise<void> {
        // convenient shortcut for typing
        let db = this.db;

        let createQuery =
            `
            CREATE TABLE IF NOT EXISTS ${this.eventStoreTableName}
            (
                ${this.entityColumn} INTEGER NOT NULL,
                ${this.eventIdColumn} INTEGER NOT NULL,
                ${this.timeStampColumn} TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
                ${this.payloadColumn} JSON NOT NULL,
                PRIMARY KEY(${this.entityColumn}, ${this.eventIdColumn}, ${this.timeStampColumn})
            )
            `;

        await db.query(createQuery);

        createQuery =
            `
            CREATE TABLE IF NOT EXISTS ${this.accountLedgerStoreTableName}
            (
                address CHAR(42) NOT NULL,
                receipt_id INTEGER NOT NULL,
                ledgerHash CHAR(66) NOT NULL UNIQUE,
                ${this.timeStampColumn} TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
                ${this.payloadColumn} JSON NOT NULL,
                PRIMARY KEY(address, receipt_id)
            )
            `;

        await db.query(createQuery);

        createQuery =
            `
            CREATE TABLE IF NOT EXISTS ${this.userTableName}
            (
                user_id SERIAL PRIMARY KEY,
                email VARCHAR (255) UNIQUE NULL,
                address CHAR (42) UNIQUE NULL,
                worker_address CHAR (42) NULL
            )
            `;

        await db.query(createQuery);
    }

    /** Return full claims from partial claims. Create a user if it does not exist. */
    public async updateClaims(email: string, address: string, workerAddress?: string): Promise<User> {
        // TODO this is a quick hack to combine email & address, need proper rewrite
        await this.initialized;
        if (!(email || address)) {
            return Promise.reject('Must provide either email or address');
        }
        email = (email || '').trim().toLowerCase();
        address = (address || '').trim().toLocaleLowerCase();
        workerAddress = workerAddress || address;

        if (email && this.cache.users[email]) {
            delete this.cache.users[email];
        }
        if (address && this.cache.users[address]) {
            delete this.cache.users[address];
        }

        let toNullable = (value: string) => {
            return value ? `'${value}'` : 'NULL';
        };

        try {
            let query =
                `
                SELECT * FROM ${this.userTableName}
                WHERE ${email ? ` email = '${email}' OR ` : ''} ${address ? ` address = '${address}' ` : ' FALSE '}
            `;

            let getExisting = async () => this.db.query(query, { type: this.db.QueryTypes.SELECT }).then(results => {
                if (results.length === 1) {
                    return results[0] as User;
                } else if (results.length === 2) {
                    throw new Error('Not implemented: join users who registered separately with email and address');
                }
                return undefined;
            });

            let existing = await getExisting();

            if (!existing) {
                let insertQuery =
                    `
                    INSERT INTO ${this.userTableName} (email, address, worker_address)
                    VALUES (${toNullable(email)}, ${toNullable(address)}, ${toNullable(workerAddress)})
                `;
                // console.log('INSERT QUERY: ', query);
                let inserted = await this.db.query(insertQuery).spread((results, metadata) => {
                    // TODO redis SET XX here
                    return metadata === 1;
                });
                if (inserted) {
                    //  console.log('INSERTED');
                    existing = await getExisting();
                    await this.addEvent(existing.user_id, EventType.Claims, existing);
                    // recursive call
                    let newUser = await this.updateClaims(email, address);
                    newUser.isNew = true;
                    return newUser;
                } else {
                    console.log('CLAIMS INSERT ERR: cannot insert new user: ', email, address);
                    return undefined;
                    // throw new Error('CLAIMS INSERT ERR: cannot insert new user: ');
                }
            } else {
                // console.log('EXISTING USER: ', existing);
                let update = false;
                if (address && existing.address !== address) {
                    existing.address = address;
                    update = true;
                }
                if (email && existing.email !== email) {
                    existing.email = email;
                    update = true;
                }
                if (workerAddress && existing.worker_address !== email) {
                    existing.worker_address = workerAddress;
                    update = true;
                }
                if (update) {

                    let updateQuery =
                        `
                        UPDATE ${this.userTableName}
                        SET email = '${existing.email}', address = '${existing.address}', worker_address = '${existing.worker_address}'
                        WHERE user_id = ${+existing.user_id}
                    `;
                    let updated = await this.db.query(updateQuery).spread((results, metadata) => {
                        // TODO redis SET XX here
                        // TODO this is inconsistent return vs INSERT, just make it work as as
                        return metadata === 1 || ((metadata as any).rowCount && (metadata as any).rowCount === 1);
                    });
                    if (!updated) {
                        console.log('CLAIMS UPDATE ERR: cannot update user: ', email, address);
                        return undefined;
                    } else {
                        await this.addEvent(existing.user_id, EventType.Claims, existing);
                    }
                }
                return existing;
            }
        } catch (err) {
            console.log('CLAIMS ERR: ', err);
            return undefined;
        }
    }

    public async findUser(emailOraddress: string | number): Promise<User> {
        await this.initialized;
        let userId: number;
        let email: string;
        let address: string;
        if (typeof emailOraddress === 'number') {
            userId = emailOraddress;
        } else {
            emailOraddress = emailOraddress.trim().toLowerCase();
            email = emailOraddress.indexOf('@') > 0 ? emailOraddress : '';
            address = email ? '' : emailOraddress;
        }

        if (userId) {
            let cached = this.cache.users[userId];
            if (cached) { return cached; }
        }
        if (email) {
            let cached = this.cache.users[email];
            if (cached) { return cached; }
        }
        if (address) {
            let cached = this.cache.users[address];
            if (cached) { return cached; }
        }

        this.logger.info('Cache miss for findUser(' + emailOraddress + ')');

        try {
            let query =
                `
                SELECT * FROM ${this.userTableName}
                WHERE ${userId ? ` user_id = ${userId}` : ' '}  ${email ? ` email = '${email}' ` : ' '} ${address ? ` address = '${address}' ` : ' '}
            `;

            let getExisting = async () => this.db.query(query, { type: this.db.QueryTypes.SELECT }).then(results => {
                if (results.length === 1) {
                    return results[0] as User;
                }
                return undefined;
            });

            let existing = await getExisting();
            this.cache.users[existing.user_id] = existing;
            if (existing.email) {
                this.cache.users[existing.email] = existing;
            }
            if (existing.address) {
                this.cache.users[existing.address] = existing;
            }
            return existing;

        } catch (err) {
            return undefined;
        }
    }

    public async addEvent(entity: number, eventType: EventType, payload: any): Promise<boolean> {
        if (Math.floor(entity) !== entity) {
            throw new Error('Entity must be an integer');
        }
        if (Math.floor(eventType) !== eventType) {
            throw new Error('Event type must be an integer');
        }
        // allow false, zeros and empty strings
        if (payload === undefined || payload === null) {
            throw new Error('Payload must be defined and not null');
        }
        await this.initialized;
        let query =
            `
            INSERT INTO ${this.eventStoreTableName}
            VALUES (${entity}, ${eventType}, DEFAULT, JSON('${JSON.stringify(payload)}') )
        `;
        try {
            return await this.db.query(query).spread((results, metadata) => {
                // TODO redis SET XX here
                return metadata === 1;
            });
        } catch (err) {
            return false;
        }
    }

    public async lastEvent<T>(entity: number, eventType: EventType, jsonSelector?: string): Promise<T> {
        if (Math.floor(entity) !== entity) {
            throw new Error('Entity must be an integer');
        }
        if (Math.floor(eventType) !== eventType) {
            throw new Error('Event type must be an integer');
        }
        await this.initialized;

        let selector: string = '';
        if (jsonSelector) {
            selector = '->' + jsonSelector;
        }
        let query =
            `
            SELECT ${this.payloadColumn}${selector} as ${this.payloadColumn} FROM ${this.eventStoreTableName}
            WHERE ${this.entityColumn} = ${entity} AND ${this.eventIdColumn} = ${eventType} ORDER BY ${this.timeStampColumn} DESC LIMIT 1
        `;
        try {
            return await this.db.query(query, { type: this.db.QueryTypes.SELECT }).then(results => {
                if (results.length === 1) {
                    return results[0][this.payloadColumn] as T;
                }
                return undefined;
            });
        } catch (err) {
            return undefined;
        }
    }

    public async addReceipt(address: string, receiptId: number, ledgerHash: string, payload: any): Promise<boolean> {
        if (!W3.isValidAddress(address)) {
            throw new Error('Invalid address');
        }
        if (payload === undefined || payload === null) {
            throw new Error('Payload must be defined and not null');
        }
        await this.initialized;
        // NB we are not checking previous hash as of now (just too lazy)
        // NB2 We need `>=` for testing/stating without redeploying contracts: e.g. if two machines try to make a transaction with separate dbs
        let query =
            `
            INSERT INTO ${this.accountLedgerStoreTableName}(address, receipt_id, ledgerHash, payload)
            (   SELECT * from (VALUES ('${address}', ${receiptId}, '${ledgerHash}', JSON('${JSON.stringify(payload)}') )) as t(address, receipt_id, ledgerHash, payload)
                WHERE t.receipt_id >= (SELECT COALESCE(MAX(receipt_id), 0) + 1 FROM ${this.accountLedgerStoreTableName} WHERE address = '${address}')
            )
        `;
        try {
            return await this.db.query(query).spread((results, metadata) => {
                // TODO redis SET XX here
                return metadata === 1;
            });
        } catch (err) {
            return false;
        }
    }

    public async lastReceipt<T>(address: string): Promise<T> {
        if (!W3.isValidAddress(address)) {
            throw new Error('Invalid address');
        }

        await this.initialized;

        let query =
            `
            SELECT ${this.payloadColumn} as ${this.payloadColumn} FROM ${this.accountLedgerStoreTableName}
            WHERE address = '${address}' ORDER BY receipt_id DESC LIMIT 1
        `;
        try {
            return await this.db.query(query, { type: this.db.QueryTypes.SELECT }).then(results => {
                if (results.length === 1) {
                    return results[0][this.payloadColumn] as T;
                }
                return undefined;
            });
        } catch (err) {
            return undefined;
        }
    }

    public async getReceiptsFromHash<T>(address: string, ledgerHash: string, count: number): Promise<T[]> {
        if (!W3.isValidAddress(address)) {
            throw new Error('Invalid address');
        }
        await this.initialized;
        let query =
            `
            SELECT ${this.payloadColumn} as ${this.payloadColumn} FROM ${this.accountLedgerStoreTableName}
            WHERE receipt_id >= (SELECT COALESCE(receipt_id, 0) FROM ${this.accountLedgerStoreTableName} WHERE ledgerHash = '${ledgerHash}')
            AND address = '${address}' ORDER BY receipt_id ASC LIMIT ${count}
        `;
        try {
            return await this.db.query(query, { type: this.db.QueryTypes.SELECT }).then(results => {
                if (results.length > 0) {
                    return results.map((r: any) => r[this.payloadColumn] as T);
                }
                return [];
            });
        } catch (err) {
            return [];
        }
    }

    public async getReceiptsFromIndex<T>(address: string, index: number, count: number): Promise<T[]> {
        if (!W3.isValidAddress(address)) {
            throw new Error('Invalid address');
        }
        await this.initialized;
        let query =
            `
            SELECT ${this.payloadColumn} as ${this.payloadColumn} FROM ${this.accountLedgerStoreTableName}
            WHERE receipt_id >= ${index}
            AND address = '${address}' ORDER BY receipt_id ASC LIMIT ${count}
        `;
        try {
            return await this.db.query(query, { type: this.db.QueryTypes.SELECT }).then(results => {
                if (results.length > 0) {
                    return results.map((r: any) => r[this.payloadColumn] as T);
                }
                return [];
            });
        } catch (err) {
            return [];
        }
    }
}
