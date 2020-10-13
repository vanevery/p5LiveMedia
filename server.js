// We need the file system here
var fs = require('fs');
				
// Express is a node module for building HTTP servers
var express = require('express');
var app = express();

// CORS middleware
var cors = require('cors');
app.use(cors(
	{
		origin: 'https://editor.p5js.org',
		optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
	}
));

// Tell Express to look in the "public" folder for any files first
app.use(express.static('public'));


// If the user just goes to the "route" / then run this function
app.get('/', function (req, res) {
  res.send('Hello World!')
});

// Here is the actual HTTP server 
// In this case, HTTPS (secure) server
var https = require('https');

// Security options - key and certificate
var options = {
  key: fs.readFileSync('star_itp_io.key'),
  cert: fs.readFileSync('star_itp_io.pem')
};

// We pass in the Express object and the options object
var httpServer = https.createServer(options, app);

// Default HTTPS port
httpServer.listen(443);

/* 
This server simply keeps track of the peers all in one big "room"
and relays signal messages back and forth.
*/
let rooms = {};
//let peers = [];

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io').listen(httpServer);

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection', 

	// We are given a websocket object in our function
	function (socket) {

		console.log("We have a new client: " + socket.id);
		// peers.push({socket: socket});

		socket.on('room_connect', function(room) {
			console.log('room_connect', room);

			if (!rooms.hasOwnProperty(room)) {
				console.log("room doesn't exist, creating it");
				rooms[room] = [];
			}
			rooms[room].push(socket);
			socket.room = room;

			console.log(rooms);

			let ids = [];
			for (let i = 0; i < rooms[socket.room].length; i++) {
				ids.push(rooms[socket.room][i].id);
			}
			console.log("ids length: " + ids.length);
			socket.emit('listresults', ids);
		});

		socket.on('list', function() {
			let ids = [];
			for (let i = 0; i < rooms[socket.room].length; i++) {
				ids.push(rooms[socket.room][i].id);
			}
			console.log("ids length: " + ids.length);
			socket.emit('listresults', ids);			
		});
		
		// Relay signals back and forth
		socket.on('signal', (to, from, data) => {
			console.log("SIGNAL", to, data);
			let found = false;
			for (let i = 0; i < rooms[socket.room].length; i++) {
				console.log(rooms[socket.room][i].id, to);
				if (rooms[socket.room][i].id == to) {
					console.log("Found Peer, sending signal");
					rooms[socket.room][i].emit('signal', to, from, data);
					found = true;
					break;
				}				
			}	
			if (!found) {
				console.log("never found peer");
			}
		});
				
		socket.on('disconnect', function() {
			console.log("Client has disconnected " + socket.id);
			if (rooms[socket.room]) { // Check on this
				for (let i = 0; i < rooms[socket.room].length; i++) {
					if (rooms[socket.room][i].id == socket.id) {
						rooms[socket.room].splice(i,1);
					} else {
						rooms[socket.room][i].emit('peer_disconnect', socket.id);
					}
				}			
			}
		});
	}
);