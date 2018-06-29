// tslint:disable:max-classes-per-file

export class JsonRPCRequest {
    private static counter: number = 0;

    private static nextCounter() {
        JsonRPCRequest.counter++;
        return JsonRPCRequest.counter;
    }
    readonly jsonrpc: string = '2.0';
    method: string;
    params: any[];
    id?: number | string;

    constructor(method: string, params: any[], notification?: boolean) {
        this.method = method;
        this.params = params;
        if (!notification) {
            this.id = JsonRPCRequest.nextCounter();
        }
    }
}

export class JsonRPCResponse {
    readonly jsonrpc: string = '2.0';
    constructor(id: number | string, result?: any, error?: JsonRPCError) {
        this.id = id;
        this.result = result;
        this.error = error;
    }
    id: number | string;
    result?: any;
    error?: JsonRPCError;
}

export class JsonRPCError {
    constructor(public code: number, public message: string, public data?: any) { }
}
