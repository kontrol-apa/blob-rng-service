const fs = require('fs');
const path = require('path');
const Utils = require('../Utils');
const Storage = require('./Storage');

class DiskStorage extends Storage {
  /**
   * @param {{
   *   workDir:string,
   * }} options
   */
  constructor(options) {
    super();
    this._workDir = options.workDir;
  }

  async get(key) {
    const file = path.join(this._workDir, key);
    const exists = await Utils.promisify(fs.exists, file);
    if (!exists[0]) {
      return null;
    }
    const result = await Utils.promisify(fs.readFile, file, 'utf8');
    if (result[0] !== null) {
      return null;
    }
    return result[1];
  }

  async put(key, value) {
    let safeVal = value + '';
    const file = path.join(this._workDir, key);
    await Utils.promisify(fs.mkdir, this._workDir, {
      recursive: true,
    });
    const result = await Utils.promisify(fs.writeFile, file, safeVal);
    return result[0] === null;
  }

  async update(key, value) {
    return this.put(key, value);
  }

  async remove(key) {
    const file = path.join(this._workDir, key);
    const exists = await Utils.promisify(fs.exists, file);
    if (exists) {
      const result = await Utils.promisify(fs.unlink, file);
      return result[0];
    }
    return false;
  }
}

module.exports = DiskStorage;
