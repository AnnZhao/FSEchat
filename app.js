//set up server
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose');

users = [];
connections = [];

server.listen(process.env.PORT || 3000);
console.log('Server running');

//database using mongodb
mongoose.connect('mongodb://localhost/fsechat', function(err){
	if(err){
		console.log(err);
	} else{
		console.log('connected to mongodb');
	}
});

var chatSchema = mongoose.Schema({
	user:String,
	msg:String,
	//created:{type: Date, default: Date.now}
	created: Date
});

var Chat = mongoose.model('Chat', chatSchema);

//Routing
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});


//recieve message
io.sockets.on('connection', function(socket){
	//retrive the previous message for new users
	Chat.find({}, function(err, docs){
		if(err) throw err;
		socket.emit('load old msgs', docs);
	});

	connections.push(socket);
	console.log('conected: %s sockets connected', connections.length);

	//disconnect
	socket.on('disconnect', function(data){
		
		if(!socket.username) return;
		delete users[socket.username];
		users.splice(users.indexOf(socket.username), 1);
		updateUsernames();
		connections.splice(connections.indexOf(socket), 1);
		console.log('Disconnected: %s sockets connected', connections.length);
	});
	

	//send message
	socket.on('send message', function(data){
		//var time = getTime();
		//console.log(time);
		//var newMsg = new Chat({msg:data, user:socket.username});
		var d1 = new Date (),
    	d2 = new Date ( d1 );
		d2.setHours ( d1.getHours() - 7 );
		var newMsg = new Chat({user: socket.username, created: d2, msg:data});
		console.log(newMsg);
		newMsg.save(function(err,msg){
			if(err) throw err;
			//var time = getTime();
			io.sockets.emit('new message', {msg: data, created: d2, user:socket.username});
			//io.sockets.emit('new message', msg);
		});
	});

	//new user
	socket.on('new user', function(data, callback){
		if(users.indexOf(data) != -1){
			callback(false);
		}
		else{
			callback(true);
			socket.username = data;
			users.push(socket.username);
			updateUsernames();
		}
	});

	function updateUsernames(){
		io.sockets.emit('get users', users);
	}
});
