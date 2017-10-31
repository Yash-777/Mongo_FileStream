
// https://github.com/mongodb/node-mongodb-native
var mongodb = require("mongodb"),
    Db = mongodb.Db,
    Server = mongodb.Server;
var Grid = require('gridfs-stream'); // 1.1.1"

var mongoHost = '127.0.0.1', mongoPort = 27017;
var user = 'mongoDBUser', password = 'mongoDBPassword';

var db = new Db('javaapps', new Server(mongoHost, mongoPort));
var gfs;
// Establish connection to db
db.open(function(err, db) {
	if(!err) {
        console.log("Connected to database");
        db.authenticate(user, password, function(err, res) {
            if(!err) {
                console.log("Authenticated");
				gfs = Grid(db, mongodb);
            } else {
                console.log("Error in authentication.");
                console.log(err);
            }
        });
    } else {
        console.log("Error in open().");
        console.log(err);
    };
});

/* Variables local to the module will be private. To export an object, add to the special exports object to the variable | function.
 https://nodejs.org/docs/v0.4.12/api/all.html#modules
 http://stackoverflow.com/a/7612052/5081877 */
module.exports.getDB = db;

module.exports.getGFS = gfs;