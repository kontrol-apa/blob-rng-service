use starknet::ContractAddress;
#[starknet::interface]
trait IExampleRandomnessRequester<TContractState> {
    fn increase_balance(ref self: TContractState, amount: felt252);
    fn get_balance(self: @TContractState) -> felt252;
    fn function_with_randomness_request(ref self: TContractState, some_param: felt252);
    fn fulfill_randomness(ref self: TContractState, random_number: u256, randomness_request_id: felt252);
    fn set_randomness_fulfiller(ref self: TContractState, randomness_fulfiller: ContractAddress);
    fn get_randomness_fulfiller(self: @TContractState) -> ContractAddress;
}

#[starknet::contract]
mod ExampleRandomnessRequester {
    use starknet::{get_caller_address,contract_address_try_from_felt252};
    use starknet::ContractAddress;

    #[storage]
    struct Storage {
        balance: felt252,
        randomness_fulfiller : ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        RandomnessRequestIssued: RandomnessRequestIssued,
        RandomnessRequestFulfilled: RandomnessRequestFulfilled
    }

    #[derive(Drop, starknet::Event)]
    struct RandomnessRequestIssued {
        request_id: felt252
    }

    #[derive(Drop, starknet::Event)]
    struct RandomnessRequestFulfilled {
        request_id: felt252
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, randomness_fulfiller : felt252
    ) {
        self.randomness_fulfiller.write(contract_address_try_from_felt252(randomness_fulfiller).unwrap());
    }
    #[external(v0)]
    impl ExampleRandomnessRequesterImpl of super::IExampleRandomnessRequester<ContractState> {
        fn increase_balance(ref self: ContractState, amount: felt252) {
            assert(amount != 0, 'Amount cannot be 0');
            self.balance.write(self.balance.read() + amount);
        }

        fn get_balance(self: @ContractState) -> felt252 {
            self.balance.read()
        }

        fn function_with_randomness_request(ref self: ContractState, some_param: felt252) {
            let x: felt252 = core::pedersen::pedersen(some_param, some_param);
            self.emit(RandomnessRequestIssued { request_id: x});
        }

        fn fulfill_randomness(ref self: ContractState, random_number: u256, randomness_request_id: felt252) {
            assert(self.randomness_fulfiller.read()==get_caller_address(),'Fulfiller Only');
            self.emit(RandomnessRequestFulfilled { request_id:randomness_request_id });
        }

        fn set_randomness_fulfiller(ref self: ContractState, randomness_fulfiller: ContractAddress) {
            // This function has to be owner only
            self.randomness_fulfiller.write(randomness_fulfiller);
        }

        fn get_randomness_fulfiller(self: @ContractState) ->  ContractAddress {
            self.randomness_fulfiller.read()
        }

    }
}
