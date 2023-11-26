module.exports = {
    commonSomething : "commonSomething",
    contractAddress : process.env.FLIPBLOB_CONTRACT_ADDRESS,
    contractStartBlock : parseInt(process.env.FLIPBLOB_INDEXING_START_BLOCK,10),
    nodeUrl : process.env.RPC_NODE_URL,
    contractFailureIdentifier : 11
}