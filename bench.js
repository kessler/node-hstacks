'use strict'

var HStacks = require('../lib/HStacks')
var async = require('async')

var topic = new HStacks()

topic.mount(['a', 'b', 'c'], function(req, res, next) {
	res.end()
})

topic.mount(['a', 'b'], function(req, res, next) {
	next()
})

topic.mount(['a', 'c'], function(req, res, next) {
	next()
})

topic.mount(['a'], function(req, res, next) {
	req.read(function(err, text) {
		req.text = text
		next()
	})
})

var time = 0

class MockRequest {
	constructor() {}

	read(cb) {
		setTimeout(function() {
			cb(null, 'read')
		}, 10)
	}
}

class MockResponse {
	constructor(cb) {
		this._cb = cb
		this._start = Date.now()
	}

	end() {
		var cb = this._cb
		var start = this._start

		setTimeout(function() {
			time += Date.now() - start
			cb()
		}, 10)
	}
}

function task(things, cb) {
	var req = new MockRequest()
	var res = new MockResponse(cb)
	topic.dispatch(['a', 'b', 'c'], [req, res])
}

const REQUESTS = 500000

var queue = async.queue(task, 10000)
var i = 0
function run() {

	while (i < REQUESTS) {
		queue.push(i)
		i++
		if (i % 1000 === 0) break;		
	}

	console.log(i)
	console.log(i / time)
	if (i === REQUESTS) {
		console.log('done')
	} else {
		setTimeout(run, 100)
	}
}

run()
