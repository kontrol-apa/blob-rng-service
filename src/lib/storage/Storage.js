class Storage {
  async get(key) {
    throw new Error('not implemented');
  }

  async put(key, value) {
    throw new Error('not implemented');
  }

  async update(key, value) {
    throw new Error('not implemented');
  }

  async remove(key) {
    throw new Error('not implemented');
  }
}

module.exports = Storage;
