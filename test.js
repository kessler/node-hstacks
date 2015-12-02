'use strict'

var expect = require('chai').expect
var HStacks = require('./index')

describe('HStacks', function() {
	var topic, handler, abc, ab, ac, a

	it('mounts middlewares in paths', function() {
		topic.mount(abc, handler)

		expect(topic._trie.get(abc)).to.eql({ stack: [handler], errorMiddleware: undefined })
	})

	it('dispatch messages to middlewares hierarchically', function (done) {
		var results = []

		topic.mount(['a', 'b', 'c'], function(a, b, next) {
			results.push('abc')
			expect(a).to.equal('1')
			expect(b).to.equal('2')
			expect(results).to.eql(['a', 'ab1', 'ab2', 'abc'])
			done()
		})

		topic.mount(['a', 'b'], function(a, b, next) {
			results.push('ab1')
			expect(a).to.equal('1')
			expect(b).to.equal('2')
			next()
		})

		topic.mount(['a', 'b'], function(a, b, next) {
			results.push('ab2')
			expect(a).to.equal('1')
			expect(b).to.equal('2')
			next()
		})

		topic.mount(['a', 'c'], function(a, b, next) {
			results.push('ac')
			expect(a).to.equal('1')
			expect(b).to.equal('2')
			next()
		})

		topic.mount(['a'], function(a, b, next) {
			results.push('a')
			expect(a).to.equal('1')
			expect(b).to.equal('2')
			next()
		})

		topic.dispatch(['a', 'b', 'c'], ['1', '2'])
	})

	describe('error middleware', function () {
		it('is mounted as a special middleware for each path/stack', function () {

			var middleware = function(err, next) {}
			topic.mountErrorMiddleware(abc, middleware)

			expect(topic._trie.get(abc).errorMiddleware).to.equal(middleware)
		})

		it('"catchs" an error passed on by a normal middleware using next(err)', function (done) {
			var history = []

			topic.mount(abc, function(a, b, next) {
				history.push('abc')
				next(new Error('!'))
			})

			topic.mountErrorMiddleware(ab, function(err, next) {
				expect(history).to.eql(['abc'])
				done()
			})

			topic.dispatch(abc, ['1', '2'])
		})

		it('accepts an error instance that contains information\n' +
			'about the origin of the error like sourcePath, stackIndex and a reference to the\n' +
			'actual error (sourceError)', function (done) {

			var sourceError

			topic.mount(abc, function(a, b, next) {
				sourceError = new Error('!')
				next(sourceError)
			})

			topic.mountErrorMiddleware(abc, function(err, next) {
				expect(err.sourceError).to.equal(sourceError)
				expect(err.sourcePath).to.eql(abc)
				expect(err.stackIndex).to.equal(0)

				done()
			})

			topic.dispatch(abc, ['1', '2'])
		})

		it('can delegate the treatment of an error to error middlewares higher up the hierarchy', function (done) {
			var history = []

			var sourceError = new Error('!')

			topic.mountErrorMiddleware(abc, function(err, next) {
				expect(history).to.eql(['abc1', 'abc2'])
				history.push('abc.err')				
				next()
			})

			topic.mountErrorMiddleware(a, function(err, next) {
				expect(history).to.eql(['abc1', 'abc2', 'abc.err'])
				expect(err.sourceError).to.equal(sourceError)
				expect(err.sourcePath).to.eql(abc)
				expect(err.stackIndex).to.equal(1)
				done()
			})

			topic.mount(['a', 'b', 'c'], function(req, res, next) {
				history.push('abc1')
				next()
			})

			topic.mount(['a', 'b', 'c'], function(req, res, next) {
				history.push('abc2')
				next(sourceError)
			})

			topic.dispatch(['a', 'b', 'c'], ['1', '2'])	
		})

		it('throws an error if no error middlewares handled the error and it reached the top/root', function () {
			expect(function () {
				var sourceError = new Error('!')

				topic.mount(['a', 'b', 'c'], function(req, res, next) {
					next(sourceError)
				})

				topic.dispatch(['a', 'b', 'c'], ['1', '2'])	
			}).to.throw('hstacks middleware error')
		})
	})

	beforeEach(function() {
		topic = new HStacks()
		handler = function () {}
		abc = ['a', 'b', 'c']
		ab = ['a', 'b']
		ac = ['a', 'c']
		a = ['a']
	})
})
