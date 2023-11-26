const crypto = require('crypto');

function hashSeedNTimesBinary(seed, N) {
    let hash = Buffer.from(seed, 'utf-8');
    const hashArray = [];

    console.time('BinaryHashingTime');

    for (let i = 0; i < N; i++) {
        hash = crypto.createHash('sha256').update(hash).digest();
        hashArray.push(Buffer.from(hash));
    }

    console.timeEnd('BinaryHashingTime');

    return hashArray.reverse();
}

function getHashAtIndexBinary(hashArray, index) {
    if (index >= 0 && index < hashArray.length) {
        return '0x' + hashArray[index].toString('hex');
    }
    return null;
}

module.exports = { hashSeedNTimesBinary, getHashAtIndexBinary}