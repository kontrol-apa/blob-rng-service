class BaseWorker {
  constructor(config, storage, logger) {
    this._config = config;
    this._logger = logger;
    this._storage = storage;
  }

  /**
   * @return {Storage}
   */
  getStorage() {
    return this._storage;
  }

  getConfig() {
    return this._config;
  }

  getLogger() {
    return this._logger;
  }

  async execute() {
    throw new Error('Not implemented');
  }
}

module.exports = BaseWorker;
