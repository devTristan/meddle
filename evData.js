var events = require('events');
var util = require('util');

var evData = function(){
	var data = {};
	var ev = {};
	var mutex = {};
	this.get = function(key, callback){
		if (mutex[key]) {
			//if the data is being written, wait for it
			this.once(key, callback);
		} else {
			//otherwise give them whatever is there, undefined or not
			callback(data[key]);
		}
	};
	this.setting = function(key){
		mutex[key] = true;
	};
	this.set = function(key, value){
		data[key] = value;
		delete mutex[key];
		this.emit(key, value);
	};
	this.watch = function(key, callback){
		if (data[key]) {
			callback(data[key]);
		}
		this.on(key, callback);
	};
};
util.inherits(evData, events.EventEmitter);

module.exports = evData;
