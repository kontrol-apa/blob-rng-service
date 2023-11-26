const fs = require('fs');

class Logger {
  /**
   * config = {
   *   console: {
   *     level: level
   *   },
   *   file: {
   *     level: level,
   *     path: path to log file
   *   }
   * }
   */
  constructor(config) {
    this._config = config;
    this._buffer = [];
    this._bufferSize = 10;
  }

  info(message) {
    this._log(Logger.level.INFO, message);
  }

  warn(message) {
    this._log(Logger.level.WARN, message);
  }

  error(message) {
    this._log(Logger.level.ERROR, message);
  }

  debug(message) {
    this._log(Logger.level.DEBUG, message);
  }

  flush() {
    const tmpBuffer = Object.assign([], this._buffer);
    this._buffer = [];
    console.log(this._config.file.path);
    fs.appendFile(this._config.file.path, tmpBuffer.join('\n') + '\n', () => {});
  }

  _log(level, message) {
    const formattedMessage = this._formatLogMessage(level, message);
    if (typeof this._config.console !== 'undefined' && this._config.console.level >= level) {
      this._logConsole(level, formattedMessage);
    }
    if (typeof this._config.file !== 'undefined' && this._config.file.level >= level) {
      this._logFile(formattedMessage);
    }
  }

  _logConsole(level, str) {
    switch (level) {
      case Logger.level.ERROR:
        console.log(`\x1b[31m${str}\x1b[0m`);
        break;
      case Logger.level.WARN:
        console.log(`\x1b[33m${str}\x1b[0m`);
        break;
      default:
        console.log(str);
        break;
    }
  }

  _logFile(str) {
    this._buffer.push(str);
    if (this._buffer.length >= this._bufferSize) {
      this.flush();
    }
  }

  _formatLogMessage(level, message) {
    let typeStr;
    switch (level) {
      case Logger.level.DEBUG:
        typeStr = 'DEBUG';
        break;
      case Logger.level.INFO:
        typeStr = 'INFO';
        break;
      case Logger.level.WARN:
        typeStr = 'WARN';
        break;
      case Logger.level.ERROR:
        typeStr = 'ERROR';
        break;
    }
    let formattedMessage = message;
    if (Array.isArray(message) || typeof message === 'object') {
      formattedMessage = JSON.stringify(message);
    }
    const dt = new Date().toISOString();
    // Remove line breaks
    formattedMessage = formattedMessage.replace(/[\r\n]/gm, '');
    return `[${typeStr}][${dt}] ${formattedMessage}`;
  }
}

Logger.level = {
  DEBUG: 4,
  INFO: 3,
  WARN: 2,
  ERROR: 1,
};

module.exports = Logger;
