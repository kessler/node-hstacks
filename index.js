'use strict'

var assert = require('assert')
var Trie = require('digital-tree')
var debug = require('debug')('hstacks')
var _ = require('lodash')
var isArray = require('util').isArray

//TODO there are lots of places in this code where I pass path + index
// those two should be combined, probably into a class Path that has next() and prev() or something

//TODO all this recursion in _next* makes the code really hard to read, need to refactor

/**
 *	Hstacks
 *	@class HStacks
 */
class HStacks {

	/**
	 *	create a new instance of hstack
	 *	@constructor
	 *	@param {Trie} trie optional digital-tree to be used, otherwise a new one is created
	 *	@param {Object} context optional context used when calling the middlewares (their this)
	 *	@api public
	 */
	constructor(trie, context) {
		this._trie = trie || new Trie()
		this._context = context
	}

	/**
	 *	dispatch a message to hstacks, this message will be handled by all the middlewares that reside along the provided path.
	 *	@param {Array} path an array of strings that represents the path in the tree
	 *	@param {Array} args an array of variables that will be used when calling each individual middleware
	 *	@return {HStacks} this instance of hstacks
	 *	@api public
	 */
	dispatch(path, args) {
		assert(isArray(args), 'args must be an array')
		debug('dispatching %d args to path %o', args.length, path)

		this._nextStack(path, 0, args)

		return this
	}

	/**
	 *	mount a middleware in the tree
	 *
	 *	@param {Array} path an array of strings that represents the path in the tree
	 *	@param {Function} middleware a function middleware
	 *	@param {Boolean} _isErrorMiddleware indicate if this is the error Middleware for this stack, this is an internal parameter, use HStacks.mountErrorMiddleware instead.
	 *	@return {HStacks} this instance of hstacks 
	 *
	 *	@api public
	 */
	mount(path, middleware, _isErrorMiddleware) {
		debug('mounting %s middleware at %o', _isErrorMiddleware ? 'error' : 'a', path)

		let entry = this._trie.get(path)

		if (!entry) {
			debug('creating a new stack for %o', path)
			entry = this._initStack()
			this._trie.put(path, entry)
		}

		if (_isErrorMiddleware) {
			entry.errorMiddleware = middleware
		} else {
			entry.stack.push(middleware)
		}

		return this
	}

	/**
	 *	gets the stack a particular path
	 *
	 *	@param {Array} path an array of strings that represents the path in the tree
	 *	@return {Array} the stack in the provided path or an empty array
	 *
	 *	@api public
	 */
	getStack(path) {
		var entry = this._trie.get(path)
		//TODO return a shallow copy is that good?
		if (entry) return entry.stack.concat([])

		return []
	}

	/**
	 *	gets the stack a particular path
	 *
	 *	@param {Array} path an array of strings that represents the path in the tree
	 *	@return {Function} the error middleware in the provided path or undefined
	 *
	 *	@api public
	 */
	getErrorMiddleware(path) {
		var entry = this._trie.get(path)

		if (entry) return entry.errorMiddleware
	}

	/**
	 *	see mount()
	 *
	 *	@param {Array} path an array of strings that represents the path in the tree
	 *	@param {Function} middleware a function middleware
	 *	@return {HStacks} this instance of hstacks 
	 *
	 *	@api public
	 */
	mountErrorMiddleware(path, middleware) {
		return this.mount(path, middleware, true)
	}

	_nextStack(path, pathLength, args, err, lastStackIndex) {
		if (err) {
			debug('error in %o %d', path, lastStackIndex)
			let hstackError = this._newError(err, path, lastStackIndex)
			this._handleError(hstackError, path)
		}

		if (pathLength > path.length) {
			debug('_nextStack() reached top')
			return
		}

		//debug('_nextStack()  %o %d', path, pathLength)

		let currentPath = path.slice(0, pathLength)

		debug('now dispatching to %o %d', path, pathLength)

		// TODO getting the path each time is not efficient since the implementation
		// always search from the top of the tree, consider adding a search from parent
		// method to digital tree or dropping it altogether for this.
		let entry = this._trie.get(currentPath)

		pathLength++

		if (!entry) {
			debug('%o does not have a stack', path)
			return this._nextStack(path, pathLength, args)
		}

		let stack = entry.stack

		debug('%o has %d middlewares', currentPath, stack.length)

		// this is how we call the next stack when this stack finishes
		var nextStackCb = _.bind(this._nextStack, this, path, pathLength, args)

		this._nextMiddleware(stack, 0, null, args, nextStackCb)
	}

	_nextMiddleware(stack, stackIndex, context, args, nextStackCb, err) {
		if (err) {
			return nextStackCb(err, stackIndex - 1)
		}

		if (stackIndex === stack.length) {
			debug('_nextMiddleware() reached the end of this stack')
			return nextStackCb()
		}

		debug('running middleware %d', stackIndex)

		// this is how we call the next middleware
		var nextMiddlewareCb = _.bind(this._nextMiddleware, this, stack, stackIndex + 1, context, args, nextStackCb)

		stack[stackIndex].apply(context, args.concat([nextMiddlewareCb]))
	}

	_handleError(err, path) {
		// TODO for now throw, but should I use event emitter / global callback of sorts instead?
		// TODO throw the wrapper error or the source?
		// no error middlewere mounted anywhere
		if (path.length === 0) {
			debug('no handlers, throwing')
			throw err
		}

		//TODO get optimization (see _nextStack)
		let entry = this._trie.get(path)
	
		if (entry && typeof (entry.errorMiddleware) === 'function') {
			debug('found error middleware in %o', path)
			let nextErrorMiddlewareCb = _.bind(this._handleError, this, err, path.slice(0, path.length - 1))
			entry.errorMiddleware(err, nextErrorMiddlewareCb)
		} else {
			let parentPath = path.slice(0, path.length - 1)
			debug('no error middleware in %o, moving upwards', parentPath)
			this._handleError(err, parentPath)
		}
	}

	_newError(err, path, index, nextMiddlewareCb) {
		//TODO need to create a subclass HStacksError
		let hstackError = new Error('hstacks middleware error')
		hstackError.sourceError = err
		//TODO return a shallow copy is that good?
		hstackError.sourcePath = path.concat([])
		hstackError.stackIndex = index
		return hstackError
	}

	_initStack() {
		let entry = {
			stack: [],
			errorMiddleware: undefined
		}

		return entry
	}
}

module.exports = HStacks
