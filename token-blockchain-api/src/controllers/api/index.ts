// import { EthController } from './v1';
import V1 from './v1';

// this won't work when tsconfig declarations is set to true, but we do not need to export types because Server is the final consumer

export let v1 = [...V1];

export default v1;
