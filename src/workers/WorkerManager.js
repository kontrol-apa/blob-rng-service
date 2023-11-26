const spawn = require('child_process').spawn;

class WorkerManager {
  constructor(config, runScriptPath, logger) {
    this._workers = {};
    this._config = config;
    this._interval = null;
    this._logger = logger;
    this._runScriptPath = runScriptPath;
    this._importWorkers();
  }

  _importWorkers() {
    const workers = {};
    for (let i = 0; i < this._config.length; i++) {
      workers[this._config[i].worker] = {
        ...this._config[i],
        ts: 0,
        ps: null,
        running: false,
      };
    }
    this._workers = workers;
  }

  _executeJob(worker, complete) {
    try {
      const child = spawn('node', [this._runScriptPath, worker.worker, worker.config], {
        detached: true,
      });
      child.stdout.on('data', (data) => {
        this._logger.info(`Worker:${worker.worker} ${data}`);
      });
      child.stderr.on('data', (data) => {
        this._logger.error(`Worker:${worker.worker} ${data}`);
      });
      child.on('exit', (code) => {
        complete(code === 0);
      });
      return child;
    } catch (e) {
      // Run async
      setTimeout(() => {
        complete(false);
      }, 0);
    }
    return null;
  }

  _killJob(worker) {
    try {
      if (worker.ps.stdin) {
        worker.ps.stdin.pause();
      }
      worker.ps.kill();
    } catch (e) {
      this._logger.error(e.message);
    }
  }

  _execute() {
    const now = Date.now();
    Object.values(this._workers).forEach((worker) => {
      if (worker.running && worker.ts + worker.maxRuntime < now) {
        this._logger.warn(`${worker.worker} hit max runtime. Killing the process.`);
        this._killJob(worker);
        worker.running = false;
        worker.ps = null;
        return;
      }
      if (worker.running || worker.ts + worker.period > now) {
        return;
      }
      this._logger.info(`${worker.worker} Executing.`);
      const ps = this._executeJob(worker, (success) => {
        this._logger.info(`${worker.worker} Completed, result: ${success ? 'success' : 'error'}`);
        worker.ps = null;
        worker.running = false;
      });
      worker.running = true;
      worker.ts = now;
      worker.ps = ps;
    });
  }

  start() {
    this._interval = setInterval(() => {
      this._execute();
    }, 1000);
  }

  stop(kill) {
    clearInterval(this._interval);
    if (kill) {
      Object.values(this._workers).forEach((worker) => {
        this._killJob(worker);
        worker.running = false;
        worker.ps = null;
      });
    }
  }
}

module.exports = WorkerManager;
