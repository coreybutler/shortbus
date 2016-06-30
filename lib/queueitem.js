'use strict'

const EventEmitter = require('events').EventEmitter

/**
 * @class Queue
 * Represents a unit of work as defined by the queue.
 */
class QueueItem extends EventEmitter {
  constructor (config) {
    super()

    Object.defineProperties(this, {
      /**
       * @cfg {string} name
       * Descriptive name of the worker.
       */
      name: {
        enumerable: true,
        writable: false,
        configurable: false,
        value: config.name || 'Unknown'
      },
      /**
       * @cfg {function} callback
       * The method to execute when the queue is ready.
       */
      callback: {
        enumerable: false,
        writable: false,
        configurable: false,
        value: config.callback
      },
      /**
       * @cfg {number} number
       * The queue item number. This is used primarily as an ID.
       */
      number: {
        enumerable: true,
        writable: false,
        configurable: false,
        value: parseInt(config.number, 10)
      },
      timer: {
        enumerable: false,
        writable: true,
        configurable: false,
        value: null
      },
      _status: {
        enumerable: false,
        writable: true,
        configurable: false,
        value: null
      },
      bus: {
        enumerable: false,
        writable: true,
        configurable: false,
        value: config.bus
      }
    })
  }

  /**
   * @property {string} status
   * May be `running`, `complete`, or `null` (not run yet)
   */
  get status () {
    return this._status
  }

  /**
   * @method run
   * Execute the callback function.
   * @param {string} mode
   * `dev` or `prod`. When in "dev" mode, verbose output is written
   * to the console.
   */
  run (mode) {
    if (mode && mode === 'dev') {
      console.log('\n---------------------------------\nExecuting ' + currentStep.name + ':')
    }

    this._status = 'running'

    const me = this
    const scope = {
      timeout: function (milliseconds) {
        me.timer = setTimeout(function () {
          me.emit('steptimeout', me)
        }, milliseconds)
      }
    }

    this.callback.apply(scope, [function () {
      me._status = 'complete'
      me.emit('stepcomplete', me)
    }])

    if (this.callback.length === 0) {
      me._status = 'complete'
      me.emit('stepcomplete', me)
    }
  }
}

module.exports = QueueItem
