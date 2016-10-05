"use strict"

var ShortBus = require('../index'),
    assert = require('assert')

suite('Queue',function () {

  var tasks

  setup(function () {
    tasks = new ShortBus('dev')
  })

  test('Add Task',function () {
    tasks.add(function () {
      console.log('Task 1')
    })
    tasks.add('t2',function () {
      console.log('Task 2')
    })
    tasks.add(function () {
      console.log('Task 3')
    })
    assert.ok(tasks.list.length === 3, 'Invalid number of steps queued. Expected: 3, Actual: '+tasks.list.length)
    assert.ok(tasks.list[0].name === 'Step 1', 'Autoname failed. Expected: Step 1, Actual: '+tasks.list[1].name)
    assert.ok(tasks.list[1].name === 't2', 'Invalid step name. Expected: t2, Actual: '+tasks.list[1].name)
  })

  test('Remove Task', function () {
    tasks.add(function () {
      console.log('Task 1')
    })
    tasks.add('t2',function () {
      console.log('Task 2')
    })
    tasks.add('t3',function () {
      console.log('Task 3')
    })
    var x = tasks.removeAt(1)
    assert.ok(x.number === 2, 'Unrecognized task removed. Expected ID #2, Actual ID: '+x.number)
    assert.ok(tasks.list.length === 2, 'Invalid number of steps queued. Expected: 2, Actual: '+tasks.list.length)
    assert.ok(tasks.list[1].name === 't3', 'Invalid step name. Expected: t3, Actual: '+tasks.list[1].name)
    x = tasks.remove('t3')
    assert.ok(x.number === 3, 'Unrecognized task removed. Expected ID #3, Actual ID: '+x.number)
    assert.ok(tasks.list.length === 1, 'Invalid number of steps queued. Expected: 1, Actual: '+tasks.list.length)
    assert.ok(tasks.list[0].name === 'Step 1', 'Invalid step name. Expected: Step 1, Actual: '+tasks.list[0].name)
    x = tasks.remove(1)
    assert.ok(x.number === 1, 'Unrecognized task removed. Expected ID #1, Actual ID: '+x.number)
    assert.ok(tasks.list.length === 0, 'Invalid number of steps queued. Expected: None, Actual: '+tasks.list.length)
  })

  test('Retrieve a task.', function () {
    tasks.add(function () {
      console.log('Task 1')
    })
    tasks.add('t2',function () {
      console.log('Task 2')
    })
    tasks.add('t3',function () {
      console.log('Task 3')
    })
    var t = tasks.getAt(1)
    assert.ok(t.number === 2,'tasks.getAt method returned unexpected value. Expected ID: 2, Received: '+t.number)
    t = tasks.get('t3')
    assert.ok(t.number === 3,'tasks.get (by name) method returned unexpected value. Expected ID: 3, Received: '+t.number)
    t = tasks.get(2)
    assert.ok(t.number === 2,'tasks.get (by ID) method returned unexpected value. Expected ID: 2, Received: '+t.number)
  })

})

suite('Processing', function () {
  var tasks

  setup(function () {
    tasks = new ShortBus()
  })

  test('Simple linear execution.',function(done){
    var x = []

    tasks.add(function () {
      x.push('Task 1')
    })
    tasks.add('t2',function () {
      x.push('Task 2')
    })
    tasks.add('t3',function () {
      x.push('Task 3')
    })

    tasks.on('complete',function () {
      assert.ok(x.length === 3, 'Invalid result.'+x.toString())
      done()
    })
    tasks.process()
  })

  test('Async execution.', function(done){
    this.timeout(4000)
    var x = []
    tasks.add(function () {
      x.push('Task 1')
    })
    tasks.add('t2a',function(next){
      setTimeout(function () {
        x.push('Task 2')
        next()
      },700)
    })
    tasks.add('t3',function () {
      x.push('Task 3')
    })

    tasks.on('complete',function () {
      assert.ok(x.length === 3, 'Invalid result.'+x.toString())
      done()
    })
    tasks.process()
  })

  test('Process timeout.',function(done){
    this.timeout(500)

    tasks.timeout = .00000000001

    var x = []
    tasks.add(function () {
      x.push('Task 1')
    })
    tasks.add('t2',function(next){
      setTimeout(function () {
        x.push('Task 2')
        next()
      },700)
    })

    tasks.on('timeout', function () {
      done()
    })

    tasks.process()

  })

  test('Task timeout.',function(done){

    this.timeout(3000)

    var x = []
    tasks.add(function () {
      x.push('Task 1')
    })
    tasks.add('t2',function(next){
      this.timeout(500)
      setTimeout(function () {
        x.push('Task 2')
        next()
      },2000)
    })

    tasks.on('steptimeout', function () {
      done()
    })

    tasks.process()

  })
})

suite('Sequential Processing', function () {
  var tasks

  setup(function () {
    tasks = new ShortBus()
  })

  test('Simple linear execution.',function(done){
    var x = []

    tasks.add(function () {
      x.push(1)
    })
    tasks.add('t2',function () {
      x.push(2)
    })
    tasks.add('t3',function () {
      x.push(3)
    })

    tasks.on('complete',function () {
      assert.ok(x[0] === 1 && x[1] === 2 && x[2] === 3, 'Invalid result.'+x.toString())
      done()
    })
    tasks.process(true)
  })

  test('Asynchronous sequential execution.', function (done) {
    var x = []

    tasks.add(function () {
      x.push(1)
    })
    tasks.add('t2',function (next) {
      setTimeout(function () {
        x.push(2)
        next()
      }, 600)
    })
    tasks.add('t3',function () {
      x.push(3)
    })

    tasks.on('complete',function () {
      assert.ok(x[0] === 1 && x[1] === 2 && x[2] === 3, 'Invalid result.'+x.toString())
      done()
    })
    tasks.process(true)
  })
})

suite('Edge Cases', function () {
  var tasks

  setup(function () {
    tasks = new ShortBus()
  })

  test('Process an empty queue.', function (next) {
    tasks.on('complete', next)

    tasks.run()
  })
})
