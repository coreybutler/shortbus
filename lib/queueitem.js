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
      },
      _skip: {
        enumerable: false,
        writable: true,
        configurable: false,
        value: false
      }
    })

    this.on('timeout', () => {
      this._status = 'timedout'
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
   * @property {boolean} skipped
   * `true` to skip the step, `false` to execute it.
   */
  get skipped () {
    return this._skip
  }

  /**
   * @method run
   * Execute the callback function.
   * @param {string} mode
   * `dev` or `prod`. When in "dev" mode, verbose output is written
   * to the console.
   */
  run (mode) {
    if (this._skip) {
      this._status = 'skipped'
      return this.abort()
    }

    this.emit('stepstarted', this)

    if (mode && mode === 'dev') {
      console.log('\n---------------------------------\nExecuting ' + this.name + ':')
    }

    this._status = 'running'

    const me = this
    const scope = Object.defineProperties({}, {
      name: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: this.name
      },

      number: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: this.number
      },

      timeout: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: function (milliseconds) {
          me.timer = setTimeout(function () {
            me.emit('steptimeout', me)
          }, milliseconds)
        }
      },

      skipped: {
        enumerable: true,
        get: function () {
          return me.skipped
        }
      },

      status: {
        enumerable: true,
        get: function () {
          return me.status
        }
      },

      abort: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: this.abort
      },

      skip: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: this.skip
      }
    })

    this.callback.apply(scope, [function () {
      me._status = 'complete'
      me.emit('stepcomplete', me)
    }])

    if (this.callback.length === 0) {
      me._status = 'complete'
      me.emit('stepcomplete', me)
    }
  }

  /**
   * @method skip
   * Skip this item
   */
  skip () {
    this._skip = true
    this._status = 'skipped'
  }

  /**
   * @method abort
   * Aborts processing.
   * @fires stepskipped
   * @fires stepcomplete
   */
  abort () {
    this.skip()
    this.emit('stepskipped', this)
    this.emit('stepcomplete', this)
  }
}

module.exports = QueueItem
