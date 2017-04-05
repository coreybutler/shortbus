[![Build Status](https://travis-ci.org/coreybutler/shortbus.svg)](https://travis-ci.org/coreybutler/shortbus)

# Shortbus

Shortbus is a lightweight flow control module that works like a mini event bus + serial/parallel processor. It makes for a great task runner.

Install via `npm install shortbus`.

This module contains minimal dependencies and [helps keep npm fit](https://medium.com/@goldglovecb/npm-needs-a-personal-trainer-537e0f8859c6).

_Use Case:_

> My process should download 3 files, combine them, and save the results to disk.

Downloading is an asynchronous process, but merging and saving to disk is not. The process must wait for all of the files to download before it can concatenate them into a single resulting file.

Shortbus was designed to support this type of use case in a human readable way. Behind the scenes, Shortbus queues tasks and event listeners, and triggers events as each step is completed. 

_Why?_

This approach produces more readable, cleaner, and well structured flow code. It provides an approach to avoid overly complicated callback structures. It also allows for dynamic sequencing (add/remove tasks, aborting, timeouts), which are commonly more difficult to accomplish using callbacks or promises.

### Example Please?

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus()
var downloads = ['file1.json','file2.json','file3.json']

downloads.forEach(function (file) {
  tasks.add('Download '+file, function (next) {
    // ... download the file...
    next()
  })
})

tasks.on('stepcomplete', function (step) {
  console.log('Just completed', step)
})

tasks.on('complete', function () {
  // ... concatenate the files & save to disk...
})

tasks.process() // Begin execution
```

Each task is executed in parallel, but the files won't be combined until every file is downloaded.

## Writing Shortbus Code

Syntatically, a Shortbus script is written as a series of event handlers. Code looks a little like a mini-event bus with a series of event handlers. Functionally, Shortbus queues tasks, executes them all at the same time, and fires the `complete` event after all registered tasks have completed.

### API

The Shortbus "class" has a few options.

#### Logging:

It supports "development" and "production" modes. The difference between these is logging. In development mode, Each task will write it's status to the console (begin/end). In testing, this was commonly used for troubleshooting asynchronous method activity.

By default, Shortbus runs in "production" mode, i.e. it will not write to `stdout`. Setting "development" mode can be accomplished in two ways. If the `NODE_ENV` environment variable is present, it's value will be used. Alternatively the mode can be explicitly set when creating the Shortbus instance:

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')

...
```

#### Tasks

Shortbus tasks represent a single task that is performed in parallel to other tasks. All tasks begin execution at the same time, but they may not complete at the same time. Shortbus automatically keeps track of task completion, and triggers the `complete` event once all tasks are done.

**Adding** a task is straightforward:

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')

// Task with a custom name
tasks.add('First Task', function () {
  ... process something ...
})

// Auto-named task
tasks.add(function () {
  ... process something else ...
})

// Use an aysnchronous task (auto-named)
tasks.add(function (next) {
  setTimeout(function () {
    ... process something else ...
    next()
  }, 2000)
})

tasks.on('complete', function () {
  console.log('All done!')
})

tasks.process()
```

This example illustrates the three primary syntaxes for adding a task. The first `task.add()` in the example accepts an optional descriptive task name and the required function as arguments of the `add([name], function)` method. The function is assumed to be synchronous.

The second `task.add()` only supplies the required function. The function is assumed to be synchronous.

The final `task.add()` only supplied the required function. However, it also uses the `next` argument. The `setTimeout` function is a contrived example of an async function that may take some more time to execute. By
using the `next` argument, the method will not be considered "finished" until `next()` is called.

**Displaying tasks:**

Shortbus maintains a queue of tasks and their status. This is accessible in the `list` attribute:

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')

tasks.timeout = 60*1000 // This will timeout after 1 minute.

tasks.add(...)
tasks.add(...)
tasks.add(...)

console.log(tasks.list)
```

**Removing a task** is also a straightforward process. Keep in mind that a tasks can only be removed before the `tasks.process()` method begins processing, or after they complete. You cannot add or remove tasks during processing.

There are two ways to remove a task. A task can be removed directly from the task `list` (an array) by index, using the `removeAt()` method:

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')

tasks.timeout = 60*1000 // This will timeout after 1 minute.

tasks.add(...)
tasks.add(...)
tasks.add(...)

tasks.removeAt(0)

console.log(tasks.list)
```

The code above would create 3 tasks, then remove the first one.

Tasks can also be removed by their descriptive name or task ID using the `remove()` method. The task ID can be found in the `list`. It is an auto-incrementing number guaranteed to be unique.

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')

tasks.timeout = 60*1000 // This will timeout after 1 minute.

tasks.add('My First Task', function () {...}) // ID: 1
tasks.add(...) // ID: 2
tasks.add(...) // ID: 3

tasks.remove('My First Task') // Remove by name
tasks.remove(3) // Remove by ID

console.log(tasks.list)
```

In the example above, the first and last tasks would be removed, leaving only the second one for processing.

**Hacking a Task:**

Tasks are just an object held in an array. An example might look like:

```js
{
  id: 1, // Auto-generated ID.
  name: 'Title', // Descriptive title
  method: function () {...}, // The JS function to run
  status: null // Can be null, running, or complete
}
```

The `id` and `status` are read-only. The name and method can both be modified. To change a task's function after it has already been created, use the `get` method to retrieve this object:

```js
var task = tasks.get('My Task') // get(name or ID)
task.name = 'New Name'

// OR

var task = tasks.getAt(0) // Get by list index (this example is requesting the first item)
task.name = 'New Name'

```

**Sequential Processing**

As of v1.0.4, it is possible to process tasks sequentially in a "one
after the other" fashion. Sequential processing will process a task
and wait for it to completely finish before starting the next task.

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')
var myArray = []

// Task with a custom name
tasks.add('First Task', function () {
  myArray.push(1)
})

// Use an aysnchronous task (auto-named)
tasks.add(function (next) {
  setTimeout(function () {
    myArray.push(2)
    next()
  }, 2000)
})

// Auto-named task
tasks.add(function () {
  myArray.push(3)
})

tasks.on('complete', function () {
  console.log(myArray.join(', '))
})

tasks.process(true) // <-- Setting `true` makes this sequential.
```

After approximately 2 seconds, the code above writes the following to the console:

```sh
1, 2, 3
```

Since tasks are executed sequentially, the second task (asynchronous)
waits 2 seconds before adding `2` to `myArray`. If sequential processing _was NOT used_, the output would have been `1, 3, 2`.

#### Timeouts

Shortbus has a process timeout feature that is _disabled_ by default. This feature will monitor the _entire_ process and fire a `timeout` event if the timeout maximum duration is exceeded. To enable this feature, set the timeout attribute before processing tasks. For example:

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')

tasks.timeout = 60*1000 // This will timeout after 1 minute.

tasks.add(...)
tasks.add(...)
tasks.add(...)

tasks.on('timeout', function (progress) {
  console.log('Progress at the point of timeout:', log)
  process.exit(1)
})

tasks.process()
```

**Individual Steps:**

Shortbus tasks also have a timeout feature that is _disabled_ by default. This feature will monitor a _single step_ and fire a `steptimeout` event. To use step-specific timeouts, use the built-in timeout feature:

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus('development')

tasks.add(function () {
  this.timeout(5*1000) // Timeout after 5 seconds
  ...
})
tasks.add(...)
tasks.add(...)

tasks.on('steptimeout', function (step) {
  console.log('Timeout: ', step)
  process.exit(1)
})

tasks.process()
```

**Aborting**

An entire series can be aborted during mid-process by calling the
`abort()` method. It's important to understand that any complete or
currently running steps will not be affected. Think of aborting
a series of tasks/steps as a way to short circuit the series of events,
similar to how pulling a domino out will stop them from _continuing_
to fall over.

Aborting an entire series of steps/tasks is simple:

```js
tasks.on('aborting', function () {
  // Triggered when the abort process starts.
})

tasks.on('aborted', function () {
  // Triggered when all tasks are flushed and the abort is complete.
})

tasks.abort()
```

Skipping an individual step is achieved by executing the `skip()`
method.

For example:

```js
tasks.on('stepskipped', function (step) {
  //...
})

tasks.getAt(2).skip() // Indicates the 3rd step should be skipped.
```

By default, _a step cannot be skipped once it has started executing_.

This triggers both 'stepskipped' AND 'stepcomplete' events for a task/step.

### Events

ShortBus fires several events that can be used for debugging, logging, or displaying legible progress of a process.

Events are handled by adding a listener:

```js
var Shortbus = require('shortbus')
var tasks = new Shortbus()

tasks.add(...)
tasks.add(...)

tasks.on('steptimeout', function (step) {
  ...
})
```

Each task event receives the queue item (step/task) object as a callback argument. The step object looks like:

```js
{
  name: '{String} name of action',
  step: '{Number} step number', // useful for seeing the order in which something is triggered
  status: '{String|Null} May be "running", "complete", or "null" (not run yet)'
}
```

#### Event Names

- `stepadded`: Fired when a new step is added to the queue.
- `stepremoved`: Fired when a step is removed from the queue.
- `stepstarted`: Fired when a step begins processing.
- `stepcomplete`: Fired when a step is done.
- `steptimeout`: Fired when a step takes too long.
- `stepskipped`: Fired when a step is skipped.
- `complete`: Fired when **all** steps are done.
- `timeout`: Fired when the entire series of events takes too long.
- `aborting`: Fired when the an abort is initiated.
- `aborted`: Fired when the series of events is aborted/cancelled.

**NOTICE** `complete`, `timeout`, `aborting`, and `aborted` are not "step" events and return no arguments in the callback.
