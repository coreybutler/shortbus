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
    }
  });

  this.on('stepcomplete',function(step){
    step.status = 'complete';

    // When the step is done, tally it
    me.completed++;
    me.mode === 'dev' && console.log(step.name+' completed'+'.\n---------------------------------');

    // If all of the queries have been tallied, we're done.
    if (me.completed === me.steps.length) {
      me.processing = false;
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
      id: this.steps.length+1,
      name: name,
      method: fn,
      status: null
    };
    this.steps.push(queue);
    this.emit('addstep',queue);
  };

  // Remove a step by name or ID. Seeks in that order
  this.remove = function(step){
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
    me.processing = true;
    if (me.timeout !== null){
      me.timer = setTimeout(function(){
        if (me.steps.length>0){
          me.steps.forEach(function(s){
            console.log(s.name,s.status===null?'NOT STARTED':s.status);
          });
        }
        throw 'Timed out.';
        process.exit(1);
      },me.timeout*1000);
    }
    for (var i=0; i< this.steps.length; i++){
      me.mode === 'dev' && console.log('\n---------------------------------\nExecuting '+me.steps[i].name+':');
      me.steps[i].status = 'running';
      me.steps[i].method(function(){
        var step = me.steps[i];
        if (Object.keys(arguments).length === 0){
          return setTimeout(function(){
            me.emit('stepcomplete',step);
          },1);
        } else {
          return function(){
            me.emit('stepcomplete',step);
          }
        }
      }());
    }
  };

};

// Inherit the even emitter awesome sauce from the native node modules
var EventEmitter = require('events').EventEmitter;
require('util').inherits(ShortBus,EventEmitter);

module.exports = ShortBus;
