var meddle = require('./index.js');

var core = meddle('core', function(req, res, next){
	req.core = true;
	setTimeout(next, 1000);
});

var session = meddle('session', function(req, res, next){
	req.session = {some: 'stuff', 'corestuff': req.core};
	next();
}).after('core');

var loggedIn = meddle('loggedIn', function(req, res, next) {
	req.loggedIn = true;
	req.loggedInSession = req.session.some;
	next();
}).after('session');

var meddler = meddle();

meddler.use(session);
meddler.use(loggedIn);
meddler.use(core);

var runner = meddler('loggedIn');
runner({}, {}, function(req, res){
	console.log('done', req, res);
});

