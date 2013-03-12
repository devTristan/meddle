var meddle = require('./index.js');

var sendMessage = meddle('send', function(data, next){
	console.log('SEND:', data.text);
	next();
});

var sender = meddle();
sender.use(sendMessage);

var send = sender('send');

var emotes = meddle('emotes', function(data, next){
	data.text = data.text.split(':)').join('<img src="smiley.gif"/>');
	next();
}).before('send');

send({text: 'Hi! :)'}); //SEND: Hi! :)

sender.use(emotes);

send({text: 'Hi! :)'}); //SEND: Hi! <img src="smiley.gif"/>
