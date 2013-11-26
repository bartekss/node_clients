var http = require('http');
var path = require('path');
var mysql = require('mysql');
var async = require('async');
var socketio = require('socket.io');
var express = require('express');


//
// MySql section
//

var db_config = {
    host: 'localhost',
    user: 'pegiejot',
    database: 'c9',
    password: ''
};

var dbConnection;

function connectDb() {
  dbConnection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  dbConnection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(connectDb, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  dbConnection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      connectDb();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

connectDb();


//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) {
    // messages.forEach(function (data) {
    //   socket.emit('message', data);
    // });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
    
    //
    // MySql CRUD operations
    //
    // var post  = {id: 1, title: 'Hello MySQL'};
    // var query = connection.query('INSERT INTO posts SET ?', post, function(err, result) {
    // });
    // console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
    //
    
    
    socket.on('get clients', function() {
        dbConnection.query('select * from clients limit 100', function(err, rows, fields) {
            if (!err){
                socket.emit('set clients', rows);
            }
        });
    });
    
    socket.on('remove client', function(client) {
        dbConnection.query('delete from clients where id = ' + client.id, function(err, rows, fields){
            if (!err){
                broadcast('client removed', client);
            }
        });
    });
    
    socket.on('add client', function() {
        console.log('adding client...');
        var currentDate = new Date();
        var enterDate = currentDate.getMonth() + "//" + currentDate.getFullYear();
        dbConnection.query('INSERT INTO clients (enter_date) VALUES (?);', [enterDate], function(err, result){
            if (!err && result.affectedRows == 1){
                dbConnection.query('select * from clients where id = ?;', [result.insertId], function(err, rows, fields) {
                    if (!err){
                        broadcast('client added', rows[0]);
                    }
                });
            }
        });
    });
    
    socket.on('update client', function(id, fieldName, fieldValue) {
        var data = {};
        data[fieldName] = fieldValue;
        dbConnection.query('update clients set ? where id = ?;', [data, id], function(err, result){
            if (!err && result.changedRows == 1){
                dbConnection.query('select * from clients where id = ?;', [id], function(err, rows, fields) {
                    if (!err){
                        broadcast('client updated', rows[0]);
                    }
                });
            }
        });
    });
    
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

