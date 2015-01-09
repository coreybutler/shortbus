/**
 * Shortbus accepts an optional parameter to determine the level of logging to use.
 *
 * ex: var tasks = new ShortBus('development');
 * ex: var tasks = new ShortBus('dev');
 *
 * The example above will generate more verbose output.
 */
var ShortBus = function(){
  var me = this; // Handle that pesky scope

  this.steps = []; // Holds the functions
  this.completed = 0; // The number of functions which have completed processing.
  this.timeout = null;

  var mode = arguments[0] || process.env.NODE_ENV || 'production';

  Object.defineProperties(this,{
    mode: {
      enumerable: true,
      get: function(){ return mode; },
      set: function(v){
        if (mode.toLowerCase().substr(0,3) === 'dev') {
          mode = 'dev';
        } else {
          mode = 'prod';
        }
      }
    },
    processing: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: false
    },
    list: {
      enumerable: true,
      get: function(){
        return this.steps.map(function(s){
          return {
            id: s.id,
            name: s.name,
            status: s.status
          };
        });
      }
    },
    timer: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: null
    },
    onTimeout: {
      enumerable: false,
      writable: false,
      configurable: false,
      value: function(){
        var log = [];
        if (me.steps.length>0){
          me.steps.forEach(function(s){
            log.push(s.name,s.status===null?'NOT STARTED':s.status);
          });
        }
        me.emit('timeout',{process:log});
//        throw new Error('Timed out.');
//        process.exit(1);
      }
    }
  });

  this.on('stepcomplete',function(step){

    // Disallow duplicates
    if (step.status === 'completed'){
      return;
    }

    step._status = 'complete';

    // When the step is done, tally it
    me.completed++;
    me.mode === 'dev' && console.log(step.name+' completed'+'.\n---------------------------------');

    // If all of the queries have been tallied, we're done.
    if (me.completed === me.steps.length) {
      me.processing = false;
      Object.keys(me.steps).forEach(function(step){
        clearTimeout(me.steps[step].timer);
      });
      me.emit('complete');
    }
  });

  this.mode = mode;

  // Add a step to the queue.
  this.add = function(name,fn) {
    if (this.processing){
      return console.warn('Cannot add a step while processing.');
    }
    if (typeof name === 'function'){
      fn = name;
      name = 'Step '+(parseInt(me.steps.length)+1);
    }
    if (fn === undefined || fn === null){
      console.error('No processing method defined for step '+(parseInt(this.steps.length)+1)+'.');
      process.exit(1);
    }

    var queue = {
      name: name,
      method: function(){
        var self = this,
            x = {
              timeout: function(milliseconds){
                queue.timer = setTimeout(function(){
                  if (me.processing) {
                    me.emit('steptimeout',queue);
                  }
                }, milliseconds);
              }
            };
        fn.apply(x,arguments);
      },
      _status: null
    };

    Object.defineProperties(queue,{
      id: {
        enumerable: true,
        writable: false,
        configurable: false,
        value:  (this.steps.length > 0 ? this.steps[this.steps.length-1].id : 0)+1
      },
      async: {
        enumerable: false,
        writable: false,
        configurable: false,
        value: (fn && fn.length > 0)
      },
      timer: {
        enumerable: false,
        writable: true,
        configurable: false,
        value: null
      },
      status: {
        enumerable: false,
        get: function(){
          return this._status;
        }
      }
    });

    this.steps.push(queue);
    this.emit('addstep',queue);
  };

  // Get a specific step by index
  this.getAt = function(i){
    return this.steps[i];
  };

  // Get a specific step by name or ID
  this.get = function(step){
    // Get by Name
    var el = me.steps.filter(function(s){
      return s.name === step;
    });
    if (el.length === 1){
      return el[0];
    }
    // Get by ID
    var el = me.steps.filter(function(s){
      return s.id === step;
    });
    if (el.length === 1){
      return el[0];
    }
  };

  // Remove a step by name or ID. Seeks in that order
  this.remove = function(step){
    if (this.processing){
      return console.warn('Cannot add a step while processing.');
    }
    // Remove by name
    var el = me.steps.filter(function(s){
      return s.name === step;
    });
    if (el.length === 1){
      me.steps = me.steps.filter(function(s){
        return s.name !== step;
      });
      return el[0];
    }
    // Remove by ID
    var el = me.steps.filter(function(s){
      return s.id === step;
    });
    if (el.length === 1){
      me.steps = me.steps.filter(function(s){
        return s.id !== step;
      });
      return el[0];
    }
  };

  // Remove at a specific array index
  this.removeAt = function(step){
    if (this.processing){
      return console.warn('Cannot add a step while processing.');
    }
    // Remove by index
    if (typeof step !== 'number'){
      return console.error('Failed to remove step: '+step);
    }
    if (step < 0 || step >= me.steps.length){
      return console.error('Step index '+step+' could not be found or does not exist.');
    }
    return me.steps.splice(step,1)[0];
  };

  // Run the queued processes in order
  this.process = function(){
    if (this.processing){
      return console.warn('Cannot start processing (already running). Please wait for this process to complete before calling process() again.');
    }
    me.processing = true;
    if (me.timeout !== null){
      me.timer = setTimeout(me.onTimeout,me.timeout);
    }
    for (var i=0; i< this.steps.length; i++){
      me.mode === 'dev' && console.log('\n---------------------------------\nExecuting '+me.steps[i].name+':');
      me.steps[i]._status = 'running';

      var step = me.steps[i];

      if (step.async){
        var cb = function(){
          me.emit('stepcomplete',step);
        };
      } else {
        var cb = setTimeout(function(){
          me.emit('stepcomplete',step);
        },1);
      }

      step.method.call(step,cb);
    }
  };

};

// Inherit the even emitter awesome sauce from the native node modules
var EventEmitter = require('events').EventEmitter;
require('util').inherits(ShortBus,EventEmitter);

module.exports = ShortBus;
