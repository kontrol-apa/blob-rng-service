/**
 */
class Event {
  /**
   * @param {string} eventName
   * @param {Array.<*>} [args]
   */
  constructor(eventName, ...args) {
    this._args = args;
    this._eventName = eventName;
    this._propagationStopped = false;
  }

  /**
   * @return {string}
   */
  getName() {
    return this._eventName;
  }

  /**
   * @return {Array.<*>}
   */
  getArgs() {
    return this._args;
  }

  /**
   * @return {boolean}
   */
  propagationStopped() {
    return this._propagationStopped;
  }

  /**
   * Stop propagation to the next handler
   */
  stopPropagation() {
    this._propagationStopped = true;
  }
}

/**
 */
class EventBus {
  /**
   */
  constructor() {
    this._handlers = {};
    this._onceHandlers = {};
  }

  /**
   * @param {string} eventName
   * @param {function} handler
   */
  on(eventName, handler) {
    if (!this._handlers[eventName]) {
      this._handlers[eventName] = [];
    }
    this._handlers[eventName].push(handler);
  }

  /**
   * @param {string} eventName
   * @param {function} handler
   */
  once(eventName, handler) {
    this.on(eventName, handler);
    if (!this._onceHandlers[eventName]) {
      this._onceHandlers[eventName] = [];
    }
    this._onceHandlers[eventName].push(handler);
  }

  /**
   * @param {string} eventName
   * @param {function} handler
   * @return {boolean}
   */
  off(eventName, handler) {
    if (!this._handlers[eventName]) {
      return false;
    }
    const index = this._handlers[eventName].indexOf(handler);
    if (index < 0) {
      return false;
    }
    this._handlers[eventName].splice(index, 1);
    if (!this._onceHandlers[eventName]) {
      return true;
    }
    const onceIndex = this._onceHandlers[eventName].indexOf(handler);
    if (onceIndex >= 0) {
      this._onceHandlers[eventName].splice(onceIndex, 1);
    }
    return true;
  }

  /**
   * @param {string} eventName
   * @param {any} [args]
   * @return {Promise<*>}
   */
  async emit(eventName, ...args) {
    if (!this._handlers[eventName]) {
      return;
    }
    const handlers = this._handlers[eventName];
    if (handlers.length === 0) {
      return;
    }
    const event = new Event(eventName, ...args);
    for (let i = 0; i < handlers.length; i++) {
      if (event.propagationStopped()) {
        break;
      }
      const handler = handlers[i];
      if (this._onceHandlers[eventName]) {
        // remove the handler if its registered for once
        const onceIndex = this._onceHandlers[eventName].indexOf(handler);
        if (onceIndex >= 0) {
          this._onceHandlers[eventName].splice(onceIndex, 1);
          this._handlers[eventName].splice(i, 1);
        }
      }
      try {
        // call the handler
        await handler(event, ...args);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * @param {string} eventName
   */
  unregisterHandlers(eventName) {
    if (this._handlers[eventName]) {
      delete this._handlers[eventName];
    }
    if (this._onceHandlers[eventName]) {
      delete this._onceHandlers[eventName];
    }
  }

  /**
   */
  destroy() {
    this._handlers = {};
    this._onceHandlers = {};
  }
}

// Convert Event into a subclass of the EventBus
EventBus.Event = Event;

module.exports = EventBus;
