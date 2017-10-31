var express = require('express');
var app = express();
var Grid = require('gridfs-stream'); // 1.1.1"
var Busboy = require('busboy'); // 0.2.9
app.listen('9002', function(){
	console.log('running on port 9002...');
});
	
var mongoHost = '127.0.0.1', mongoPort = 27017;
var user = 'mongoDBUser', password = 'mongoDBPassword';
var bucketName = 'automation_images'; // my_collection

var mongoose = require('mongoose');
//var Schema = mongoose.Schema;

// https://docs.mongodb.com/manual/reference/connection-string/
var connectionString = 'mongodb://'+user+':'+password+'@'+mongoHost+'/javaapps';

var options = { server: { socketOptions: { keepAlive: 1 } } };
console.log('connectionString: ',connectionString);

// https://howtonode.org/node-js-and-mongodb-getting-started-with-mongojs
var collections = ["mycollection"];

// http://mongoosejs.com/docs/connections.html
// http://stackoverflow.com/a/26698686/5081877
mongoose.connect(connectionString, collections, options);
var conn = mongoose.connection;

var db = mongoose.connection.db;
var mongoDriver = mongoose.mongo;
//var gfs = Grid(db, mongoDriver); ;

var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;
var gfs = Grid(mongoose.connection.db, mongoDriver);
gfs.collection( bucketName); //set collection name to lookup into

// Add those events to get more info about mongoose connection:

// access the native mongodb functions inside mongoose:
// Connected handler
mongoose.connection.on('connected', function (err) {
	console.log("Connected to DB using chain: " + connectionString);
});

mongoose.connection.once('open', function () {
	console.log("OPEN Connected to DB using chain: " + connectionString);
	// Normal collection full data
	/*mongoose.connection.db.collection("parallelExecution", function(err, collection){
		collection.find({}).toArray(function(err, data){
			console.log(data); // it will print your collection data
		})
	});*/
});

// Error handler
mongoose.connection.on('error', function (err) {
	console.log(err);
});
// Reconnect when closed
mongoose.connection.on('disconnected', function () {
	self.connectToDatabase();
});
 
// make sure the db instance is open before passing into `Grid`

// Routes
app.get('/', function(req, res){
	res.send('Hello World! - Yash');
});

app.get('/download/:id', function(req, res) {
	var readstream = gfs.createReadStream({
		_id: req.params.id,
		mode:'w'
	});
	readstream.pipe(res);
});

app.get('/file/:id', function(req, res) {
	var options = {_id: req.params.id, root: bucketName};
	// check if file exists « https://github.com/aheckmann/gridfs-stream#check-if-file-exists
	gfs.exist(options, function (err, found) {
		if (err) {
			return handleError(err);
		}

		if (!found) {
			console.log('Error on the database looking for the file.');
			//return;
		}

		// We only get here if the file actually exists, so pipe it to the response
		//gfs.createReadStream({ _id: id }).pipe(res);
	
		found ? console.log('File exists') : console.log('File does not exist');
		console.log('File Found : ',found);
	});
	
	/** First check if file exists */
	// http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findOne
	// https://mongodb.github.io/node-mongodb-native/markdown-docs/queries.html#find-first-occurence-with-findone
	// https://github.com/aheckmann/gridfs-stream/blob/master/test/index.js#L678
	gfs.findOne(options, function (err, file) {
		console.log('Requested with ID : ', req.params.id );
		if (err) {
			return res.status(400).send(err);
		}
		if (!file) {
			return res.status(404).send('');
		}

		res.set('Content-Type', file.contentType);
		res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
	
		// streaming from gridfs
		var readstream = gfs.createReadStream({
			_id: file._id,
			root: bucketName
		});
	
		//error handling, e.g. file does not exist
		readstream.on("error", function(err) {
			console.log("Got error while processing stream " + err.message);
			res.end();
		});

		readstream.pipe(res);
	});
});

// http://localhost:9002/file/58fe0426a0570d141f5df4b3
// db.getCollection('automation-images.files').find({"_id" : ObjectId("58eba7bf673eb3f79093f66b")})
// - /file/58fdfe44c6ea8c38286a9458
app.post('/mongodb/file', function(req, res) {
	var busboy = new Busboy({ headers : req.headers });
	var fileId = new mongoose.mongo.ObjectId();

	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		console.log('filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
		
		//gfs.collection('myCollection'); //set collection name to lookup into
	
		// streaming to gridfs
		// The root collection to store the files. By default this value is null.
		//When the value of this property is null MongoDb will use the default collection name 'fs' to store files. 
		// https://www.npmjs.com/package/multer-gridfs-storage#root
		var writeStream = gfs.createWriteStream({
			_id: fileId,
			filename: filename,
			mode: 'w',
			content_type: mimetype,
			root: bucketName // root name for collection to store files into - Default: 'fs'
			// Bucket will be 'my_collection' instead of 'fs'
		});
		file.pipe(writeStream);
	}).on('finish', function() {
		console.log('Done parsing form!');
		// show a link to the uploaded file
		res.writeHead(200, {'content-type': 'text/html'});
		res.end('<a href="/file/' + fileId.toString() + '">download file</a>');
	});

	req.pipe(busboy);
});

app.get('/mongodb', function(req, res) {
	// show a file upload form
	res.writeHead(200, {'content-type': 'text/html'});
	res.end(
			'<form action="/mongodb/file" enctype="multipart/form-data" method="post">'+
			'<input type="file" name="file"><br>'+
			'<input type="submit" value="Upload">'+
			'</form>'
	);
});

// Locate all the entries using find
/*collection.find({'a':'b'}).toArray(function(err, results) {
	//whatever you want to do with the results in node such as the following
	res.render('home', {
		'title': 'MyTitle',
		'data': results
	});
});*/