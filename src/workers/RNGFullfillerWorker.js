const BaseWorker = require('./BaseWorker');
const { hash, Contract, constants, Account, num, RpcProvider } = require("starknet");

const { getHashAtIndexBinary, hashSeedNTimesBinary } = require("../lib/RNGGenerator");

class RNGFullfillerWorker extends BaseWorker {
    constructor(config, storage, logger) {
        super(config, storage, logger);
        this.commonConfig = this.getConfig();
        this._timeOutId = null;
        this._timeOutInterval = 5000 || parseInt(process.env.EVENT_POLLING_INTERVAL_MS);
        this.searchAndfulfillRequests = this.searchAndfulfillRequests.bind(this); // bind to current context
        this.rngs = hashSeedNTimesBinary(process.env.RANDOMNESS_SEED, parseInt(process.env.RANDOM_NUMBER_AMOUNT) || 1000000);
        this.randomnessProviderPrivateKey = process.env.RANDOMNESS_PROVIDER_PRIVATE_KEY;
        this.randomnessProviderAccountAddress = process.env.RANDOMNESS_PROVIDER_ACCOUNT_ADDRESS;
        this.randomnessRequesterContractAddress = process.env.RAMDOMNESS_REQUESTER_CONTRACT_ADDRESS;
        this.randomnessRequesterContractABI; // set dynamically 
        this.rpcProvider = new RpcProvider({ nodeUrl: process.env.RPC_NODE_URL, retries: 3 });
        this.randomnessProvider = new Account(this.rpcProvider, this.randomnessProviderAccountAddress, this.randomnessProviderPrivateKey);
        this.keyFilter = [num.toHex(hash.starknetKeccak("RandomnessRequestIssued")), "0x8", num.toHex(hash.starknetKeccak("RandomnessRequestFulfilled")), "0x8"];
        this.startBlock = parseInt(process.env.RANDOMNESS_REQUESTER_INDEXING_START_BLOCK);
        this.randomnessRequester;
        this.recentRequestsBuffer = []
        this.recentRequestsBufferLength = parseInt(process.env.FINALIZATION_HISTORY_BUFFER_LEN) || 20;
        this.currentRandomNumberIndex = 0; // incremented after every finalization, starts from 0
        this.blocksToWait = 2 || process.env.BLOCKS_TO_WAIT; // this is only relevant if there is an open request for some time. In an event of start just wait this amount of blocks to ensure that all unifinalized requests are actually missing and not due to the fulfilled event not being received yet.
        this.blockToWaitUntil;

    }


    async execute() {
        await this._createAndConnectRandomnessRequesterContract();
        this._timeOutId = await this.searchAndfulfillRequests();

    }

    async waitNBlocksBeforeStarting() {
        const {block_number} = await this.rpcProvider.getBlockWithTxHashes('latest');

    }

    async _createAndConnectRandomnessRequesterContract() {
        await this._getRandomnessRequesterContractABI(); // todo refactor with args maybe
        this.randomnessRequester = new Contract(this.randomnessRequesterContractABI, this.randomnessRequesterContractAddress, this.rpcProvider);
        this.randomnessRequester.connect(this.randomnessProvider);
    }

    async _getRandomnessRequesterContractABI() {
        const compressedContract = await this.rpcProvider.getClassAt(this.randomnessRequesterContractAddress);
        this.randomnessRequesterContractABI = compressedContract.abi;
    }


    async searchAndfulfillRequests() {
        try {
            const eventsData = await this._fetchRandomnessEvents();
            this._processEventsAndFillRequestBuffer(eventsData);
            const requestsToFulfill = this._extractUnfulfilledRequests();
            if(!this.blockToWaitUntil || this.blockToWaitUntil > this.startBlock) {
                if(requestsToFulfill.length === 0) { // all good, continue, nothing hanging 
                    this.blockToWaitUntil = this.startBlock;
                }
                else if(!this.blockToWaitUntil) { // we have an unfulfilled request and we havent set until when to wait
                    this.blockToWaitUntil = this.startBlock + this-this.blocksToWait;
                    return setTimeout(this.searchAndfulfillRequests, this._timeOutInterval);
                    // we set until when to wait and restart
                }
        
            }
            for (let i = 0; i < requestsToFulfill.length; i++) {
                const { requestId } = requestsToFulfill[i];
                await this.fulfillRandomnessRequest(requestId);
            }
            this.pruneRecentRequestsBuffer();
            return setTimeout(this.searchAndfulfillRequests, this._timeOutInterval);


        }
        catch (error) {
            console.error("Error fetching events:", error);
            return setTimeout(this.searchAndfulfillRequests, this._timeOutInterval);

        }
    }

    async _fetchRandomnessEvents() {
        try {
            const lastBlock = await this.rpcProvider.getBlockWithTxHashes('latest');
            console.log(`last block onchain ${lastBlock.block_number}`)
            const eventsData = []
            // Only query if startBlock is not ahead of lastBlock
            if (this.startBlock <= lastBlock.block_number) {
                let continuationToken = null;
                let chunkNum = 1;

                while (1) {
                    const eventsRes = await this.rpcProvider.getEvents({
                        address: this.randomnessRequesterContractAddress,
                        from_block: { block_number: this.startBlock },
                        to_block: { block_number: lastBlock.block_number },
                        keys: [this.keyFilter],
                        chunk_size: 50,
                        continuation_token: continuationToken
                    });


                    const nbEvents = eventsRes.events.length;
                    continuationToken = eventsRes.continuation_token;
                    eventsData.push(...eventsRes.events);
                    console.log("chunk nb =", chunkNum, ".", nbEvents, "events recovered.");
                    console.log("continuation_token =", continuationToken);
                    chunkNum++;
                    if (!continuationToken) {
                        break
                    }
                }

                this.startBlock = lastBlock.block_number + 1;
            }
            else {
                console.log("No new block to index, skipping...");
            }
            return eventsData;



        } catch (error) {
            console.error("Error fetching events:", error);
            return [];
        }

    }

    async _processEventsAndFillRequestBuffer(eventsData) {
        const parsedEvents = this.randomnessRequester.parseEvents({ events: eventsData });
        for (let index = 0; index < eventsData.length; index++) {
            const item = eventsData[index];
            const eventType = Object.keys(parsedEvents[index])[0];
            if (eventType === 'RandomnessRequestIssued') {
                this.updateRecentRequestsBufferWithIssuedRequest(item, parsedEvents[index]);
            } else if (eventType === 'RandomnessRequestFulfilled') {
                this.updateRecentRequestsBufferWithFulfilledRequest(item, parsedEvents[index]);
            } else {
                console.log("SHouldnt happpen");
            }
        }

    }

    updateRecentRequestsBufferWithIssuedRequest(eventData, parsedEventData) {

        const parsedhIssuedRequestData = parsedEventData.RandomnessRequestIssued;
        const data = { requestId: parsedhIssuedRequestData.request_id, issuedOnBlockNumber: eventData.block_number, issueTransactionHash: eventData.transaction_hash, status: "Issued", fulfilledOnBlockNumber: 0, fulfillTransactionHash: "" }
        this.recentRequestsBuffer.push(data);
    }

    updateRecentRequestsBufferWithFulfilledRequest(eventData, parsedEventData) {

        const parsedhFulfilledRequestData = parsedEventData.RandomnessRequestFulfilled;
        this.handleFulfillOperations(parsedhFulfilledRequestData.request_id, eventData);
    }

    handleFulfillOperations(request_id, eventData) {
        const entryToUpdate = this.recentRequestsBuffer.find(entry => entry.requestId === request_id);
        if (!entryToUpdate) {
            console.log(`Ǹo such request id issued!`);
            return;
        }
        entryToUpdate.status = "Fulfilled";
        entryToUpdate.fulfilledOnBlockNumber = eventData.block_number;
        entryToUpdate.fulfillTransactionHash = eventData.transaction_hash;
        this.currentRandomNumberIndex++; // no risk of double increment after finalization, since any finalized request request wont appear here

    }

    async fulfillRandomnessRequest(requestId) {

        const fulfillTxHash = await this.randomnessRequester.fulfillRandomnessRequest(requestId, this.rngs[this.currentRandomNumberIndex]);
        const txReceipt = await this.rpcProvider.waitForTransaction(fulfillTxHash);
        const events = this.randomnessRequester.parseEvents(txReceipt);
        const fulfilledRandomnessEvent = events.find(val => val.hasOwnProperty('RandomnessRequestFulfilled'));
        this.handleFulfillOperations(fulfilledRandomnessEvent['RandomnessRequestFulfilled'].request_id, txReceipt);

    }

    pruneRecentRequestsBuffer() {
        while (this.recentRequestsBuffer.length > this.recentRequestsBufferLength) {
            const fulfilledIndex = myArray.findIndex(element => element.status === 'Fulfilled');
            if (fulfilledIndex !== -1) {
                myArray.splice(fulfilledIndex, 1); // Removes the element with 'Fulfilled' status
            } else {
                console.error("Error: Cannot find any more elements with 'Fulfilled' status to remove.");
                break; // Break the loop if no suitable element is found
            }
        }
    }


    _extractUnfulfilledRequests() {
        return this.recentRequestsBuffer.filter(entry => entry.status === 'Issued');

    }


    async _coldStartOperations() {
        // 1. start from the inception block. fetch all events so far
        // 2. determine the counter
        // you start, get the blocknumber and just wait for N blocks to make sure that any fulfilled event from the latest start is already shown in events.
        // if you dont do that it might happens that after  quick restart you might end up tryina to fulffill a request twice due to the fulffill event not showing up (yet). This wait ensures that a missing fullfilment is actually missing and not just perceived so for the time being. Another appracoh would be counting nonces but this is not reliable.
    }

    // Some questions 
    // how do you make sure that an event is not finalized multiple times ?
    // how do you sure that the counter is right ?
    // what happens in an event of a server restart ?
}

module.exports = RNGFullfillerWorker;