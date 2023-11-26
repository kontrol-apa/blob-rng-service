
import { Contract, Account, constants, CallData, RpcProvider, shortString } from 'starknet';
import { json } from 'starknet';
import { execSync } from 'child_process';
import fs from 'fs';



const absolutePath = "../target/dev/"

scarbBuild();

const { privateKey, accountAddress, provider } = getConfig("TESTNET");
const randomness_request_fullfiller = accountAddress // todo change to another account if you want
const account = new Account(
    provider,
    accountAddress,
    privateKey
);

const compiledTestSierra = json.parse(fs.readFileSync( absolutePath + "example_contract_ExampleRandomnessRequester.contract_class.json").toString( "ascii"));
const compiledTestCasm = json.parse(fs.readFileSync( absolutePath + "example_contract_ExampleRandomnessRequester.compiled_contract_class.json").toString( "ascii"));

const contractCallData = new CallData(compiledTestSierra.abi);
const contractConstructor = contractCallData.compile("constructor", {
    randomness_fulfiller: randomness_request_fullfiller
    });


const deployResponse = await account.declareAndDeploy({ contract: compiledTestSierra, casm: compiledTestCasm, constructorCalldata: contractConstructor });
// Connect the new contract instance:
const myTestContract = new Contract(compiledTestSierra.abi, deployResponse.deploy.contract_address, provider);
console.log("RandomnessRequester Contract Class Hash =", deployResponse.declare.class_hash);
console.log('✅ RandomnessRequester Contract connected at =', myTestContract.address);
console.log(`Randomness Request Finalizer Address is : ${randomness_request_fullfiller}. Make sure its funded!`);
myTestContract.connect(account);






function getConfig(network) {
    let privateKey = process.env.STARKNET_PRIVATE_KEY;
    let accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS;
    let provider;
    // Check if environment variables are set
    if (!privateKey || !accountAddress) {
        try {
            // Read configuration from file
            const configFile = fs.readFileSync('config.json', 'utf8');
            const config = JSON.parse(configFile);

            // Assign values based on the specified network
            privateKey = config[network].STARKNET_PRIVATE_KEY;
            accountAddress = config[network].STARKNET_ACCOUNT_ADDRESS;
        } catch (error) {
            console.error('Error reading config file:', error);
            process.exit(1);
        }
    }
    if (network == "TESTNET") {
         provider = new RpcProvider({ sequencer: { network: constants.NetworkName.SN_GOERLI } }) // for testnet
    }
    else {
         provider = new RpcProvider({ sequencer: { network: constants.NetworkName.SN_MAIN } }) // for testnet
    }
    return { privateKey, accountAddress, provider};
}

function scarbBuild() {
    try {
        const stdout = execSync('scarb build');
        console.log(`stdout: ${stdout}`);
    } catch (error) {
        console.error(`Execution error: ${error}`);
        console.error(`stderr: ${error.stderr}`);
    }
}
