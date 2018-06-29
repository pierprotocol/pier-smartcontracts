export interface User {
    user_id: number;
    email: string;
    address: string;
    worker_address: string;
    isNew?: boolean;
    isDisabled?: boolean;
}
