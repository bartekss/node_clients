var mysql = require('mysql');

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


dbConnection.query('select * from clients limit 10', function(err, rows, fields) {
    if (err){
        console.log('error qhile querying :(');
        dbConnection.end();
        throw err;
    }
    console.log(rows)
});