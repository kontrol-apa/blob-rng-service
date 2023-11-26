const Logger = require('../src/lib/Logger');
const {syncDb} = require('../src/lib/db-drivers/init-models');
const loggerConfig = {
  console: {
    level: Logger.level.DEBUG,
  },
  file: {
    level: Logger.level.WARN,
    path: './logs/data-server.log',
  }
}
const l = new Logger(loggerConfig);
const argv = process.argv;

if (argv.length === 4) {
  // We are running single worker
  const Worker = require(`../src/workers/${argv[2]}.js`);
  const conf = require(`../config/${argv[3]}.js`);
  const storageConf = require(`../config/storage.js`);
  const Storage = require(`../src/lib/storage/${storageConf.type}`);
  const storage = new Storage(storageConf.options);
  const w = new Worker(conf, storage, l);
  w.execute().then(() => { });
} else {
  syncDb()
  // Start worker manager (main process)
  const config = require(`../config/${argv[2]}.js`);
  const WorkerManager = require('../src/workers/WorkerManager');
  const manager = new WorkerManager(config, __filename, l);
  manager.start();

  ['SIGINT', 'SIGQUIT', 'SIGTERM'].forEach((cmd) => {
    process.on(cmd, () => {
      manager.stop(true);
    });
  });
}
