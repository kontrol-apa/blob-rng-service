class Utils {
  static uuid() {
    const uuid = require('uuid').v4;
    return uuid();
  }

  static async promisify(callable, ...args) {
    return new Promise((resolve, reject) => {
      try {
        // Assuming callback is the last argument
        callable(...args, (...resp) => {
          resolve(resp);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  static extractFileName(file) {
    const parts = file.split('.');
    parts.pop();
    return parts.join('.');
  }

  static arrToAssoc(arr, key) {
    const obj = {};
    for (let i = 0; i < arr.length; i++) {
      obj[arr[i][key]] = arr[i];
    }
    return obj;
  }

  static shuffleArray(arr) {
    return arr.sort(() => (Math.random() > 0.5 ? 1 : -1));
  }

  static parseJson(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
}

module.exports = Utils;
