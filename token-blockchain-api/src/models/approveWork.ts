import { Allow, Required, JsonProperty } from 'ts-express-decorators';
import { Title, Description} from 'ts-express-decorators/swagger';

export interface Success<T> {
    success?: T;
}

export interface Failure {
    error?: string;
}

@Title('ApproveWorkRequest')
@Description('ApproveWorkRequest')
export class ApproveWorkRequest {
    @Required()
    @JsonProperty()
    @Description('Must be a valid  Ethereum address')
    workerAddress: string;

    /** Unique project id, could be internal and not an address */
    @JsonProperty()
    @Required()
    @Allow('')
    @Description('Unique project id, could be internal and not an address')
    projectId: string;

    /** Number of tokens (multiplied by 1e18, i.e. in smallest units) */
    @JsonProperty()
    @Required()
    @Description('Number of nano tokens')
    amount: number;

    /** Number from 0 to 100 stored in the least significant byte. (there is 3 reserved bytes in int32) */
    @JsonProperty()
    @Required()
    @Description('rating as a number from 0 to 100')
    rating: number;
}

// tslint:disable-next-line:max-classes-per-file
@Title('ApproveWorkResponse')
@Description('ApproveWorkResponse')
export class ApproveWorkResponse implements Success<boolean>, Failure {
    @JsonProperty()
    success?: boolean;

    @Description('Number of nano tokens')
    @JsonProperty()
    balance?: string;

    @JsonProperty()
    error?: string;

    @JsonProperty()
    txHash?: string;

    @JsonProperty()
    worker?: string;
}
