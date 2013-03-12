var async = require('async');
var evData = require('./evData');

var middleware = function(name, callback){
	this.name = name;
	
	var parents = [];
	
	this.parent = function(parent){
		parents.push(parent);
	};
	
	this.run = function(){
		if (callback) {
			var args = Array.prototype.slice.call(arguments);
			var next = args.pop();
			args.push(next);
			callback.apply(this, args);
		} else {
			var next = Array.prototype.slice.call(arguments).pop();
			next();
		}
	};
	
	var before = {};
	var after = {};
	
	this.before = function(){
		var args = Array.prototype.slice.call(arguments);
		if (args.length == 0) {return Object.keys(before);}
		
		for (var i in args) {
			if (typeof args[i] == 'object') {
				this.before.apply(this, args[i]);
				continue;
			}
			before[args[i]] = true;
			for (var i in parents) {
				parents[i].addDependency(name, args[i], name);
			}
		}
		return this;
	};
	
	this.after = function(){
		var args = Array.prototype.slice.call(arguments);
		if (args.length == 0) {return Object.keys(after);}
		
		for (var i in args) {
			if (typeof args[i] == 'object') {
				this.after.apply(this, args[i]);
				continue;
			}
			after[args[i]] = true;
			for (var i in parents) {
				parents[i].addDependency(name, name, args[i]);
			}
		}
		return this;
	};
};

/*
Usage:
var loggedIn = meddle(function(req, res, next) {
	req.loggedIn = true;
	next();
}).after('session');
var meddler = meddle();
meddler.use(loggedIn)
app.get('/', meddler('loggedIn'), function(req, res){
	res.end();
	console.log(req.loggedIn);
});
*/
var meddle = function(middlewareName, middlewareCallback){
	if (Array.prototype.slice.call(arguments).length == 2) {
		return new middleware(middlewareName, middlewareCallback);
	}
	
	var dependencies = {};
	var ware = {};
	
	var pub = function(name){
		return function(){
			var args = Array.prototype.slice.call(arguments);
			var lastArg = args.pop();
			
			var callback;
			if (typeof lastArg == 'function') {
				callback = lastArg;
			} else {
				callback = function(){};
				args.push(lastArg);
			}
			
			pub.run(name, args, callback);
		};
	};
	
	pub.removeDependencies = function(origin){
		for (var i in dependencies) {
			for (var i2 in dependencies[i]) {
				delete dependencies[i][i2][origin];
				if (Object.keys(dependencies[i][i2]).length == 0) {
					delete dependencies[i][i2];
				}
			}
		}
	};
	pub.addDependency = function(origin, who, what){
		//origin says that who depends on what. Get it?
		if (!dependencies[who]) {
			dependencies[who] = {};
		}
		if (!dependencies[who][what]) {
			dependencies[who][what] = {};
		}
		dependencies[who][what][origin] = true;
	};
	pub.getDependencies = function(who){
		if (!dependencies[who]) {return [];}
		return Object.keys(dependencies[who]);
	};
	
	pub.use = function(middle){
		var args = Array.prototype.slice.call(arguments);
		if (typeof middle == 'string') {
			var name = args[0];
			var callback = args[1];
			if (ware[name]) {
				pub.removeDependencies(name);
			}
		
			ware[name] = new middleware(name, callback);
			ware[name].parent(pub);
			return ware[name];
		};
		
		
		if (ware[middle.name]) {
			pub.removeDependencies(middle.name);
		}
		
		ware[middle.name] = middle;
		
		var before = middle.before();
		var after = middle.after();
		for (var i in before) {
			pub.addDependency(middle.name, before[i], middle.name);
		}
		for (var i in after) {
			pub.addDependency(middle.name, middle.name, after[i]);
		}
		
		return middle;
	};
	
	pub.run = function(name, args, callback, dependencyCache){
		if (typeof name == 'function') {
			var newArgs = args.slice(0);
			newArgs.push(function(){
				callback();
			});
			name.run.apply(pub, newArgs);
			return;
		}
		
		if (!dependencyCache) {dependencyCache = new evData();}
		
		var allDeps = pub.getDependencies(name);
		var realDeps = [];
		
		async.forEach(allDeps, function(item, cb){
			dependencyCache.get(item, function(value){
				if (typeof value == 'undefined') {
					realDeps.push(item);
				}
				cb();
			})
		}, function(err){
			if (err) throw err;
			
			async.forEach(realDeps, function(item, cb){
				pub.run(item, args, function(){cb();}, dependencyCache);
			}, function(err){
				if (err) throw err;
				
				dependencyCache.setting(name);
				
				//pub.run(ware[name], args, callback);
				var newArgs = [];
				newArgs.push.apply(newArgs, args);
				newArgs.push(function(){
					dependencyCache.set(name, true);
					callback();
				});
				ware[name].run.apply(pub, newArgs);
			});
		});
	};
	
	return pub;
};

module.exports = meddle;

var thing = meddle();
