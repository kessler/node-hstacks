# hstacks [![npm status](http://img.shields.io/npm/v/hstacks.svg?style=flat-square)](https://www.npmjs.org/package/hstacks) 

**hierarchical stacks** takes the middleware concept and expand it to a hierarchy of stacks. This construct was designed with http framework in mind but the implemetation tries to be as neutral as possible, so it will be usable for other problem domains.

**(WIP)**

## install

With [npm](https://npmjs.org) do:

```
npm install --save hstacks
```

## example

A rudimentary http server with middlewares

```js
var HStacks = require('hstacks')
var http = require('http')

var hstacks = new HStacks()

// mount some middlewares
// this is the root
hstacks.mount([''], function (req, res, next) {
    console.log(req.url)
    next()
})

hstacks.mount(['', 'a'], function (req, res, next) {
    console.log('/a middleware')
    res.end()
})

hstacks.mount(['', 'b'], function (req, res, next) {
    console.log('/b middleware')
    res.end()
})

http.createServer(function(req, res) {
    hstacks.dispatch(req.url.split('/'), [req, res])
})

```

## concepts
### path
A path inside a tree: e.g ```a->b->c```. A path is always represented by an array ```['a', 'b', 'c']```. Each path might hold a stack or middlewares and a special error middleware.

### stack
A stack is an array of middlewares nested inside a path in the tree. When middlewares are processed in a stack they are processed from index 0 to stack.length -1

### middleware
A middleware function is a part of a stack and takes the form of:
```javascript
function middleware(arg1, arg2, ... , next) {

}
```

Calling ```next()```indicates that descendant stacks in the tree should also process the arguments.
Calling ```next(err)``` will break the normal flow of execution and kick in the error middlewares

A middleware is mounted on a path:
```javascript
hstacks.mount(['a', 'b'], function (msg, next) {
    console.log(msg)
    next()
})

hstacks.mount(['a', 'b'], function (msg, next) {
    console.log('hey its that message...', msg)
})
```

In this example a->b->c has two middlewares handling messages

### error middleware
A special middleware the exists outside of any stack. An error middleware is invoked when a normal middleware calls its ```next()``` function with an error.

Mounting an error middleware is done through a different api:
```javascript
hstacks.mountErrorMiddleware(['a'], function (err, next) {

})
```
And always have the same signature (as opposed to a normal middleware)

## message processing flow
When dispatching a message to the tree, the message is processes by each stack along the path from the root downwards. For example a message dispatched to path ```['a', 'b', 'c']``` will be processed by the stack that resides in ```['a']```, the stack in ```['a', 'b']``` and finally by ```['a', 'b', 'c']```. Each middleware in each stack most call its ```next()``` callback or execution is halted.

## error processing flow
When a middleware in one of the stacks calls its ```next()``` callback with an error, hstacks will look for an error middleware in the current path level and invoke it. If no error middleware is found, hstack will begin to traverse up the tree along the path looking to error middlewares. If none is found the error will be thrown (as a general rule one should always mount at least one error middleware)

## api

  - [new HStacks()](#new-hstackstrietrie-optional-contextobject-optional)
  - [HStacks.dispatch()](#hstacksdispatchpatharrayargsarray)
  - [HStacks.mount()](#hstacksmountpatharraymiddlewarefunction_iserrormiddlewareboolean)
  - [HStacks.getStack()](#hstacksgetstackpatharray)
  - [HStacks.getErrorMiddleware()](#hstacksgeterrormiddlewarepatharray)
  - [HStacks.mountErrorMiddleware()](#hstacksmounterrormiddlewarepatharraymiddlewarefunction)

#### new HStacks(trie:Trie (optional), context:Object (optional))

create a new instance of hstack

#### HStacks.dispatch(path:Array, args:Array)

dispatch a message to hstacks, this message will be handled by all the middlewares that reside along the provided path.

#### HStacks.mount(path:Array, middleware:Function)

mount a middleware in the tree

#### HStacks.getStack(path:Array)

gets the stack a particular path

#### HStacks.getErrorMiddleware(path:Array)

gets the stack a particular path

#### HStacks.mountErrorMiddleware(path:Array, middleware:Function)

see mount()

## license

[MIT](http://opensource.org/licenses/MIT) © [yaniv kessler](blog.yanivkessler.com)
