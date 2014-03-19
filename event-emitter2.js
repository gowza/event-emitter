/*jslint
  browser: true
  node: true
  indent: 2
  regexp: true
  evil: true
*/

/*properties +es5,
 chainObject, chainString, emit, EventEmitter, eventListeners, has, make, off, on, value, expression, callback, descriptor,
 parseEventName, eventName, containerName, fireOnce, n, describe
*/

"use strict";

/* Package: EventEmitter
 *
 * A standard implementation of the EventEmitter pattern.
 * Has some extra features such as.
 *
 * Bubbling:
 * (start code)
 * var ev = new EventEmitter();
 *
 * //generic use
 * ev.on('readyStateChange' , function(param1 , param2){
 *  //this will get called whenever ready state changes
 *  //gets called 4 times
 *  console.log('readyStateChange');
 * });
 *
 * //bubble use
 * ev.on('readyStateChange:4' ,  function(param1 , param2){
 *  //this will get called only when ready state changes to four
 *  console.log('readyStateChange is 4');
 * });
 *
 * ev.emit('readyStateChange:1' , param1 , param2); // 'readyStateChange'
 * ev.emit('readyStateChange:2' , param1 , param2); // 'readyStateChange'
 * ev.emit('readyStateChange:3' , param1 , param2); // 'readyStateChange'
 * ev.emit('readyStateChange:4' , param1 , param2); // 'readyStateChange' 'readyStateChange is 4'
 * (end)
 *
 * Multiple Events:
 *
 * The above code can be re written like this.
 * (start code)
 * var ev = new EventEmitter();
 *
 * ev.on({
 *  'readyStateChange': function (param1, param2) {
 *   //this will get called whenever ready state changes
 *   //gets called 4 times
 *   console.log('readyStateChange');
 *  },
 *  'readyStateChange:4': function (param1, param2) {
 *   //this will get called only when ready state changes to four
 *   console.log('readyStateChange is 4');
 *  }
 * });
 *
 * ev.emit('readyStateChange:1' , param1 , param2); // 'readyStateChange'
 * ev.emit('readyStateChange:2' , param1 , param2); // 'readyStateChange'
 * ev.emit('readyStateChange:3' , param1 , param2); // 'readyStateChange'
 * ev.emit('readyStateChange:4' , param1 , param2); // 'readyStateChange' 'readyStateChange is 4'
 * (end)
 */
function EventEmitter() {
  Object.defineProperty(this, 'eventListeners', {
    "value": {}
  });
}

/* Function: make
 * *static*
 * Morph an object into an EventEmitter (instanceof does not work).
 * This method is a shallow copy of the <EventEmitter>'s methods, nothing more.
 *
 * Parameters:
 * toEventEmitter - *object* The object that will become an eventEmmitter
 *
 * Errors:
 * 1 - toEventEmitter is not an object
 *
 * Returns:
 * toEventEmitter - *object* The object that has become an eventEmmitter
 *
 * Example:
 * (start code)
 * var obj = {}4
 * // morph obj into an event-emitter
 * EventEmitter.make(obj);
 *
 * // subscribe to a custom event
 * obj.on('someEvent', function () {
 *  console.log('some event has been dispacted on obj')
 * });
 *
 * // dispactch the event
 * obj.emit('someEvent');
 * (end)
 */
EventEmitter.make = function make(toEventEmitter) {
  if (!(toEventEmitter instanceof Object)) {
    return new EventEmitter();
  }

  Object.keys(EventEmitter.prototype)
    .forEach(function (method) {
      toEventEmitter[method] = EventEmitter.prototype[method];
    });

  EventEmitter.apply(toEventEmitter);

  return toEventEmitter;
};

EventEmitter.chainObject = function chainObject(self, func, obj) {
  Object.keys(obj)
    .forEach(function (eventName) {
      func.call(self, eventName, obj[eventName]);
    });

  return self;
};

EventEmitter.chainString = function chainString(self, func, string) {
  var applyArgs = Array.prototype.slice.call(arguments, 3);

  string.split(' ')
    .forEach(function (eventName) {
      func.apply(self, [eventName].concat(applyArgs));
    });

  return self;
};

EventEmitter.parseEventName = function parseEventName(self, eventName, callback) {
  var expression = eventName.replace(/^[^\[]+/, ''),
    containerName = eventName.slice(0, eventName.length - expression.length),
    eventListeners = self.eventListeners[containerName];

  function expressionToFunc(exp) {
    /* 99% use case */
    if (/^[0-9]+$/.test(exp)) {
      exp = parseInt(exp, 10);

      return function () {
        return exp;
      };
    }

    /* 1% use case */
    if (exp === "n") {
      return function (n) {
        return n;
      };
    }

    return function () {
      throw new Error("Unsupported expression " + exp);
    };
  }

  return {
    "eventName": eventName,
    "expression": (expression || "[1=1]")
      .slice(1, -1)
      .split('=')
      .map(expressionToFunc),
    "containerName": containerName,
    "eventListeners": eventListeners instanceof Array
      ?
          eventListeners
      :
          false,
    "callback": callback
  };
};

/* Function: on
 * Generic event registration method. This is how to bind/attach/listen for an event.
 *
 * Parameters:
 * eventName - *string*|*object* The name of the event e.g 'focus' or 'readyState:4' or the chainable object.
 * callback - *function* The callback which will be called in the context of the eventEmitter and provided any optional arguments
 *
 * Errors:
 * 1 - was not called in context
 * 2 - eventName must be a string
 * 3 - callback must be a function
 *
 * Returns:
 * this - The scope in which it was called.
 *
 * Example:
 * see above <EventEmitter>;
 */
EventEmitter.prototype.on = function on(eventName, callback) {
  /* By using the method stored on the prototype, rather than this.emit
   * it allows implementers to overwrite emit on the instance without
   * breaking expected functionality
   */
  var emit = EventEmitter.prototype.emit,
    eventListeners,
    binding;

  /* To check context, instanceof should work, however this means that any "morphed" objects
   * will cause any of the copied prototype methods to fail.
   * So we check for what we need
   */
  if (
    !this ||
      !(this.eventListeners instanceof Object)
  ) {
    throw new Error('EventEmitter::on[was not called in context]');
  }

  if (
    eventName &&
      (typeof eventName === 'object')
  ) {
    return EventEmitter.chainObject(this, on, eventName);
  }

  if (
    !eventName ||
      typeof eventName !== 'string'
  ) {
    throw new Error('EventEmitter::on[eventName must be either a string or an object]');
  }

  if (typeof callback !== 'function') {
    throw new Error('EventEmitter::on[callback must be a function]');
  }

  if (/ /.test(eventName)) {
    return EventEmitter.chainString(this, on, eventName, callback);
  }

  binding = EventEmitter.parseEventName(this, eventName, callback);
  eventListeners = binding.eventListeners;

  if (!eventListeners) {
    eventListeners = this.eventListeners[binding.containerName] = [];

    if (binding.containerName !== 'newEventGroup') {
      emit.call(this, 'newEventGroup', binding.containerName);
    }
  }

  if (
    eventListeners.fireOnce === true &&
      eventListeners.n > 0
  ) {
    setTimeout(callback.bind(this), 16);
    return this;
  }

  eventListeners.push(binding);

  if (binding.containerName !== 'newListener') {
    emit.call(this, 'newListener', binding.containerName, callback);
  }

  return this;
};

/* Function: off
 * *chainable*
 * Generic event resignation method
 *
 * Parameters:
 * eventName - *string* The name of the event e.g 'focus' or 'readyState:4'
 * callback - *function* The previous event handler passed in
 *
 * Errors:
 * 1 - was not called in context
 * 2 - eventName must be a string
 * 3 - callback must be a function
 *
 * Returns:
 * this - The scope in which it was called.
 *
 * Example:
 * (start code)
 * function foo (){...}
 * //this is a round about way of calling foo
 * (new EventEmitter())
 *  .on('foo:bar' , foo)
 *  .emit('foo:bar')
 *  .off('foo:bar', foo);
 * (end)
 */
EventEmitter.prototype.off = function off(eventName, callback) {
  var eventListeners,
    binding,
    i = 0;

  if (
    !this ||
      !(this.eventListeners instanceof Object)
  ) {
    throw new Error('EventEmitter::off[was not called in context]');
  }

  if (
    !!eventName &&
      (typeof eventName === 'object')
  ) {
    return EventEmitter.chainObject(this, off, eventName);
  }

  if (
    !eventName ||
      typeof eventName !== 'string'
  ) {
    throw new Error('EventEmitter::off[eventName must be a string]');
  }

  if (typeof callback !== 'function') {
    throw new Error('EventEmitter::off[callback must be a function]');
  }

  if (/ /.test(eventName)) {
    return EventEmitter.chainString(this, off, eventName, callback);
  }

  binding = EventEmitter.parseEventName(this, eventName, callback);
  eventListeners = binding.eventListeners;

  if (eventListeners) {
    while (i < eventListeners.length) {
      if (
        eventListeners[i].callback === callback &&
          eventListeners[i].eventName === eventName
      ) {
        eventListeners.splice(i, 1);
        break;
      }

      i += 1;
    }
  }

  return this;
};

/* Function: has
 * A method to check if the emitter has an event
 *
 * Parameters:
 * eventName - *string* The name of the event to check for
 * optFunc - *function* An optional parameter which will make has check for the existance of the specific function as well
 *
 * Errors:
 * 1 - was not called in context
 * 2 - eventName must be a string
 *
 * Returns:
 * hasFunc - *bool* Depending on arguments, will either return true if the named event has listeners, or if the named event has a specific listener
 *
 * Example:
 * (start code)
 * var eev = new EventEmitter();
 *
 * ev.has('eventName'); // false
 *
 * ev.on('eventName', function () {...});
 *
 * ev.has('eventName'); // true
 *
 * ev.has('eventName', function () {...}); // false
 *
 * var func = function () {...};
 *
 * ev.on('eventName', func');
 *
 * ev.has('eventName', func'); // true
 * (end)
 */
EventEmitter.prototype.has = function has(eventName, optFunc) {
  var i = 0,
    binding,
    eventListeners;

  if (
    !this ||
      !(this.eventListeners instanceof Object)
  ) {
    throw new Error('EventEmitter::has[was not called in context]');
  }

  if (
    !eventName ||
      typeof eventName !== 'string'
  ) {
    throw new Error('EventEmitter::has[eventName must be a string]');
  }

  binding = EventEmitter.parseEventName(this, eventName);
  eventListeners = binding.eventListeners;

  if (
    !eventListeners ||
      eventListeners.length === 0
  ) {
    return false;
  }

  if (optFunc) {
    while (i < eventListeners.length) {
      if (
        eventListeners[i].callback === optFunc &&
          binding.eventName === eventName
      ) {
        return true;
      }

      i += 1;
    }

    return false;
  }

  return true;
};

/* Function: emit
 * *chainable*
 * Generic event trigger method, can pass parameters.
 *
 * Parameters:
 * type - *string* The name of the event e.g 'focus' or 'readyState:4'
 * args... - *var* Any variable number of arguments
 *
 * Example:
 * (start code)
 * // make the event emitter
 * var ev = new EventEmitter();
 *
 * // bind to a random event
 * ev.on('someEvent', function () {
 *  console.log(arguments);
 * });
 *
 * // dispatch the event
 * ev.emit('someEvent', 'a', 'b', 7); // CONSOLE: ['a', 'b', 7]
 *
 * // do it classy
 * ev.emit({
 *  "someEvent": "only one arg allowed",
 *  "someOtherEvent": {}
 * });
 * (end)
 *
 * Errors:
 * 1 - emit was not called in context
 * 2 - eventName must be a string
 */

EventEmitter.prototype.emit = function emit(eventName) {
  var eventListeners,
    expression,
    applyArgs,
    bindings,
    binding,
    n,
    i;

  if (
    !this ||
      !(this.eventListeners instanceof Object)
  ) {
    throw new Error('EventEmitter::emit[was not called in context]');
  }

  if (
    !!eventName &&
      (typeof eventName === 'object')
  ) {
    return EventEmitter.chainObject(this, emit, eventName);
  }

  if (
    !eventName ||
      typeof eventName !== 'string'
  ) {
    throw new Error('EventEmitter::emit[eventName must be a string]');
  }

  applyArgs = Array.prototype.slice.call(arguments, 1);

  if (/ /.test(eventName)) {
    return EventEmitter.chainString.apply(null, [this, emit, eventName].concat(applyArgs));
  }

  while (eventName.length > 0) {
    eventListeners = this.eventListeners[eventName];

    if (eventListeners instanceof Array) {
      n = eventListeners.n = (eventListeners.n || 0) + 1;
      /* If off is called during emit, this can have unstable results
       * because i is incremented but the handlers.length is reduced by one.
       * This is fixed by copying the handlers array and checking if the function
       * is still in the original array before invokation
       */
      if (
        !eventListeners.fireOnce ||
          n === 1
      ) {
        for (
          i = 0,
            bindings = eventListeners.slice(0);
          i < bindings.length;
          i += 1
        ) {
          binding = bindings[i];
          expression = binding.expression;

          if (
            eventListeners.indexOf(binding) !== -1 &&
              expression[0](n) === expression[1](n)
          ) {
            binding.callback.apply(this, applyArgs);
          }
        }
      }
    }

    /* About: Event Bubbling
     * If there is a : in the event name, it is expected that the event will bubble up. i.e.
     * server:request:acknowledge
     * server:request
     * server
     */
    eventName = eventName.substring(0, eventName.lastIndexOf(':'));
  }

  return this;
};


/* Function: describe
 * *chainable*
 * Method for defining attributes about an event.
 *
 * Parameters:
 * type - *string* The name of the event e.g 'focus' or 'readyState:4'
 * args... - *var* Any variable number of arguments
 *
 * Example:
 * (start code)
 * // make the event emitter
 * var ev = new EventEmitter();
 *
 * // bind to a random event
 * ev.on('someEvent', function () {
 *  console.log(arguments);
 * });
 *
 * // dispatch the event
 * ev.emit('someEvent', 'a', 'b', 7); // CONSOLE: ['a', 'b', 7]
 *
 * // do it classy
 * ev.emit({
 *  "someEvent": "only one arg allowed",
 *  "someOtherEvent": {}
 * });
 * (end)
 *
 * Errors:
 * 1 - emit was not called in context
 * 2 - eventName must be a string
 */

EventEmitter.prototype.describe = function describe(eventName, details) {
  var eventListeners;

  if (
    !this ||
      !(this.eventListeners instanceof Object)
  ) {
    throw new Error('EventEmitter::describe[was not called in context]');
  }

  if (
    !eventName ||
      typeof eventName !== 'string'
  ) {
    throw new Error('EventEmitter::describe[eventName must be a string]');
  }

  if (/ /.test(eventName)) {
    return EventEmitter.chainString(this, describe, eventName, details);
  }

  eventListeners = this.eventListeners[eventName];

  if (!(eventListeners instanceof Array)) {
    eventListeners = this.eventListeners[eventName] = [];
  }

  if (details.hasOwnProperty('fireOnce')) {
    eventListeners.fireOnce = !!details.fireOnce;
  }

  return this;
};

/* Property: eventListeners
 * *private*
 * Event Listener container, best left untouched
 */
EventEmitter.prototype.eventListeners = null;

if (typeof module === 'object') {
  module.exports = EventEmitter;
}