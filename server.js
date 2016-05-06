// server.js
var express = require('express');
var app = express();
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var config = require('./config');

function getModel () {
  return require('./lights/model-' + config.get('DATA_BACKEND'));
}

app.use(express.static(__dirname + '/'));
app.use(bodyParser.urlencoded({
	'extended' : 'true'
}));
app.use(bodyParser.json({
	type : 'application/vnd.api+json'
}));
app.use(methodOverride());


// Listen on the connection event for incoming sockets
io.on('connection', function(socket) {
	console.log('A user has connected');

	// Get latest updates from datastore
	socket.on('pollDB', function(data, callback) {

		// Uncomment to query the db!
		getModel().list(40, function (err, entities, cursor) {
    	if (err) {
      	return next(err);
    	}
			callback({
				entities : entities
			});
  	});

		// Read from a file (some fake data)
		// fs.readFile(__dirname + '/data/entities.json', 'utf8', function(err, data) {
		// 	callback({
		// 		entities : JSON.parse(data).entities
		// 	});
		// });
	});
});
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

http.listen(8080, function() {
	console.log('listening on *:8080');
});
