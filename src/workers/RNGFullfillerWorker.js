const BaseWorker = require('./BaseWorker');
const { Provider, Contract, constants, Account, num, RpcProvider } = require("starknet");

const { getHashAtIndexBinary, hashSeedNTimesBinary } = require("../lib/RNGGenerator");

class RNGFullfillerWorker extends BaseWorker {
    constructor(config, storage, logger) {
        super(config, storage, logger);
        this.commonConfig = this.getConfig();
        this._timeOutId = null;
        this._timeOutInterval = 5000 | parseInt(process.env.EVENT_POLLING_INTERVAL_MS);
        this._searchRequestsToFinalize = this._searchRequestsToFinalize.bind(this); // bind to current context
        this.rngs = hashSeedNTimesBinary(process.env.RANDOMNESS_SEED, parseInt(process.env.RANDOM_NUMBER_AMOUNT) | 1000000);
        this.finalizationHistoryBuffer = [];
        this.finalizationHistoryBufferLen = parseInt(process.env.FINALIZATION_HISTORY_BUFFER_LEN) | 20;
        this.randomnessProviderPrivateKey = process.env.RANDOMNESS_PROVIDER_PRIVATE_KEY;
        this.randomnessProviderAccountAddress = process.env.RANDOMNESS_PROVIDER_ACCOUNT_ADDRESS;
        this.randomnessRequesterContractAddress = process.env.RAMDOMNESS_REQUESTER_CONTRACT_ADDRESS;
        this.randomnessRequesterIndexingStartBlock = parseInt(process.env.RANDOMNESS_REQUESTER_INDEXING_START_BLOCK); // can be undefined
        this.randomnessRequesterContractABI;
        this.rpcProvider = new RpcProvider({ nodeUrl: process.env.RPC_NODE_URL, retries: 3 });
        this.randomnessProvider = new Account(this.rpcProvider, this.randomnessProviderAccountAddress, this.randomnessProviderPrivateKey);
        this.keyFilter = [num.toHex(hash.starknetKeccak("RequestIssued")), "0x8", num.toHex(hash.starknetKeccak("RequestFinalized")), "0x8"];
        this.startBlock = process.env.RANDOMNESS_REQUESTER_INDEXING_START_BLOCK;
        this.randomnessRequester;

    }

    async _createAndConnectRandomnessRequesterContract() {
        this.randomnessRequesterContractABI = await this._getRandomnessRequesterContractABI();
        this.randomnessRequester = new Contract(this.randomnessRequesterContractABI, this.randomnessRequesterContractAddress, this.rpcProvider);
        this.randomnessRequester.connect(this.randomnessProvider);
    }

    async _getRandomnessRequesterContractABI() {

    }

    async _setRandomnessRequesterCreationBlockId() {
        if(!this.startBlock) {
            this.startBlock = 2313; // TODO FETCH FROM ADDY
        }
    }
    async execute() {
        await this._createAndConnectRandomnessRequesterContract();
        await this._setRandomnessRequesterCreationBlockId();
        this._timeOutId = await this._searchRequestsToFinalize();

    }

    async _searchRequestsToFinalize() {

    }

    async _coldStartOperations() {
        // 1. start from the inception block. fetch all events so far
        // 2. determine the counter 
    }

    // Some questions 
    // how do you make sure that an event is not finalized multiple times ?
    // how do you sure that the counter is right ?
    // what happens in an event of a server restart ?
}

module.exports = RNGFullfillerWorker;