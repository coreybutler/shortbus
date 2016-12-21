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

    this.on('stepskipped', () => {
      this._status = 'skipped'
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
    if (this.skipped) {
      this.emit('stepskipped', this)

      if (mode && mode === 'dev') {
        console.log('\n=================================\nSKIPPED ' + this.name)
        console.log('\n=================================\n')
      }

      return
    }

    this.emit('stepstarted', this)

    if (mode && mode === 'dev') {
      console.log('\n---------------------------------\nExecuting ' + this.name + ':')
    }

    this._status = 'running'

    const me = this
    const scope = {
      name: this.name,
      number: this.number,
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

  /**
   * @method skip
   * Skip this item
   */
  skip () {
    if (this._status === 'running') {
      console.warn('Cannot skip step: ' + this.name + ' is currently running.')
    } else if (this._status === 'timedout') {
      console.warn('Cannot skip step: ' + this.name + ' timed out.')
    } else if (this._status === 'complete') {
      console.warn('Cannot skip step: ' + this.name + ' already completed.')
    }

    this._skip = true
  }
}

module.exports = QueueItem
