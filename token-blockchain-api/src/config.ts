
let fs = require('fs');

export interface Pipe {
    in: string;
    out: string;
}

export interface Config {
    redis: {
        host: string,
        port: number
    };
    postgres: {
        host: string,
        user: string,
        password: string,
        db: string
    };
    session: {
        secret: string
    };
    api: {
        prefix: string,
        ws: string,
        port: number
    };
    w3: {
        provider: string,
        networkId?: number
    };
    sqs?: {
        pipes: Pipe[]
        region: string,
        access_key: string,
        access_key_secret: string;
    };
}

export let config: Config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));
