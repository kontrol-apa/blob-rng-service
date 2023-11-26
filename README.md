# blob-rng-service
a simple verifiable fair random number generator

## Why ?

StarkNet doesnt have Chainlink VRF or any similar reliable verifiable random number generation service integrated **yet**. To remedy this, we have developed our own verifiable fair random number generator service.

## How does it guarantee fairness ? 

To ensure fairness N random numbers are generated in a deterministic way using a cryptographic hashing function. By doing so, it can be proven that all of the random numbers are deterministically generated beforehand and are not modified later on based on the user input to allow the protocol cheat. The following steps are used:

1. a random seed **- which is supposed to be kept secret -** is  generated and fed into the service.  
2. Its is hashed with a cryptographic hashing function (sha256) N times. 
3. The resulting hashes are stored in an array in the reverse order, so that the first element of the array is actually the Nth element.
4. When a randomness request is issued, the next item in the array is used, so that its N, N-1, N-2, ...,seed.
5. It is impossible to guess N-1th number from Nth number due to the properties of the hashing function.
6. It is trivial to verify that the sequence of random numbers are indeed following a hashing chain. Any external party can start hashing the last revealed random number and get the previously revealed random numbers up until the Nth random number.

## Getting Started 

The service runs on a docker container so you only need to install docker and set some environment variables in the `.env` file. 

### Mandatory Environment Variables 

1. `REQUEST_ISSUER_ACCOUNT_ADDRESS` : 
2. `REQUEST_ISSUER_PRIVATE_KEY` : 
3. `RANDOMNESS_REQUESTER_CONTRACT_ADDRESS` :  
4. `RANDOMNESS_SEED` : 
5. `RPC_NODE_URL` : 
6. `EVENT_POLLING_INTERVAL_MS` : 

### Optional Environment Variables 

1. **Indexing start block**

### Contract Modifications 

You cairo contract needs to emit two events and expose a specific function to finalize requests. Please refer to `example_contract` directory where you can find an example implementation. The 2 step architecture mimics Chainlink VRF setup, where a randomness request is made and then fulfilled in the next blocks.

**Events**

1. `RandomnessRequestIssued` : Must be emitted by the function that requests randomness with a  unique `request_id` .
2. `RandomnessRequestFullfilled`: Must be emitted by the function `fulfill_randomness` which is called by the rng service to fulfill the randmoness request

````rust
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        RandomnessRequestIssued: RandomnessRequestIssued,
        RandomnessRequestFullfilled: RandomnessRequestFullfilled
    }

    #[derive(Drop, starknet::Event)]
    struct RandomnessRequestIssued {
        request_id: felt252
    }

    #[derive(Drop, starknet::Event)]
    struct RandomnessRequestFullfilled {
        request_id: felt252
    }
````



**Contract function**

1. `fulfill_randomness`:  This function with the exact name, must be exposed by the contract. This function is going to be called by the RNG service so it is important that the function signatures match. 

```
        fn fulfill_randomness(ref self: ContractState, random_number: u256, randomness_request_id: felt252) {
            assert(self.randomness_fulfiller.read()==get_caller_address(),'Fulfiller Only');
            self.emit(RandomnessRequestFullfilled { request_id:randomness_request_id });
        }
```

**Important: ** 

1. Its paramount that this function can be called by only one address, depicted as `randomness_fulfiller`. Otherwise the contract will be exposed to any malicious agent. 
2. Its a good idea to prevent fulfillment of a request twice by introducing the appropriate check in this function. The example contract doesn't do that for the sake of simplicity.

### Architecture 

![Architecture Diagram](https://github.com/kontrol-apa/blob-rng-service/blob/main/diagrams/architecture.svg?raw=true)
