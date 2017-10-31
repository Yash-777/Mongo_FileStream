var Busboy = require('busboy'); // 0.2.9
var express = require('express'); // 4.12.3
var app = express();

app.listen('9007', function(){
	console.log('running on port 9007...');
});

// https://github.com/mongodb/node-mongodb-native
var mongo = require('mongodb'); // 2.0.31
var Grid = require('gridfs-stream'); // 1.1.1"

var http = require('http'),
    path = require('path'),
    os = require('os'),
    fs = require('fs');
var mkdirp = require('mkdirp');

var mongoHost = '127.0.0.1', mongoPort = 27017;
var dbName = 'javaapps', user = 'mongoDBUser', password = 'mongoDBPassword';

var bucketName = 'videos', bucketName2 = 'videos'; // my_collection

// create or use an existing mongodb-native db instance.
var db = new mongo.Db(dbName, new mongo.Server(mongoHost, mongoPort));

// http://thecodebarbarian.com/mongodb-gridfs-stream
var gfs, collection;

// make sure the db instance is open before passing into `Grid`
db.open(function(err, db) {

	if(!err) {
		console.log("Connected to database");
		db.authenticate(user, password, function(err, res) {
			if(!err) {
				console.log("Authenticated");
				gfs = Grid(db, mongo); //  = new Gridfs(db, mongoDriver);
			} else {
				console.log("Error in authentication.");
				console.log(err);
			}
		});
	} else {
		console.log("Error in authentication open().");
		console.log(err);
		throw err;
	}
});


app.get('/dbOperation/insert', function(req, res) {
	console.log("Connected correctly to server");
	// Create a collection we want to drop later
	var collection = db.collection('simple');
	// Insert a bunch of documents for the testing
	collection.insertMany([{aa:1, ba:1}, {aa:2, ba:2}, {aa:3, ba:3}], {wa:1}, function(err, result) {
		console.log("Connected correctly to server");
		db.close();
	});
});

// MongoDB Chunks - Files and Videos Steams.
app.get('/mongodb/file', function(req, res) {
	// show a file upload form
	res.writeHead(200, {'content-type': 'text/html'});
	res.end(
		'<form action="/mongodb/fileImage" enctype="multipart/form-data" method="post">'+
		'<input type="file" name="file"><br>'+
		'<input type="submit" value="Upload">'+
		'</form>'
	);
});
app.get('/mongodb/video', function(req, res) {
	// show a file upload form
	res.writeHead(200, {'content-type': 'text/html'});
	res.end(
		'<form action="/mongodb/fileVideo" enctype="multipart/form-data" method="post">'+
		'<input type="file" name="file"><br>'+
		'<input type="submit" value="Upload">'+
		'</form>'
	);
});

// http://localhost:9007/file/58fe0426a0570d141f5df4b3
// db.getCollection('image.files').find({"_id" : ObjectId("58eba7bf673eb3f79093f66b")})
app.post('/mongodb/fileImage', function(req, res) {
	var busboy = new Busboy({ headers : req.headers });
	var fileId = new mongo.ObjectId();

	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		console.log('File ['+ fieldname +']: filename: '+ filename +', encoding: '+ encoding +', mimetype: '+ mimetype);
		
		//gfs.collection('myCollection'); //set collection name to lookup into

		// streaming to gridfs
		// The root collection to store the files. By default this value is null.
		//When the value of this property is null MongoDb will use the default collection name 'fs' to store files. 
		// https://www.npmjs.com/package/multer-gridfs-storage#root
		// https://docs.mongodb.com/manual/reference/command/filemd5/
		var writeStream = gfs.createWriteStream({
			_id: fileId,
			filename: filename,
			mode: 'w',
			content_type: mimetype,
			root: bucketName // root name for collection to store files into - Default: { root: 'fs' } 
			// Bucket will be 'my_collection' instead of 'fs'
		});
		file.pipe(writeStream);
	}).on('finish', function() {
		console.log('Done parsing form!');
		// show a link to the uploaded file
		res.writeHead(200, {'content-type': 'text/html'});
		res.end('<a href="/file/' + fileId.toString() + '">download file</a><br><img src="/file/' + fileId.toString() + '"/>');
	});

	req.pipe(busboy);
});

app.post('/mongodb/fileVideo', function(req, res) {
	var busboy = new Busboy({ headers : req.headers });
	var fileId = new mongo.ObjectId();


	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		console.log('File ['+ fieldname +']: filename: '+ filename +', encoding: '+ encoding +', mimetype: '+ mimetype);

		var writeStream = gfs.createWriteStream({
			_id: fileId,
			filename: filename,
			mode: 'w',
			content_type: mimetype,
			root: bucketName2 // root name for collection to store files into - Default: { root: 'fs' } 
			// Bucket will be 'my_collection' instead of 'fs'
		});
		file.pipe(writeStream);
	}).on('finish', function() {
		console.log('Done parsing form!');
		// show a link to the uploaded file
		res.writeHead(200, {'content-type': 'text/html'});
		res.end('<a href="/file/' + fileId.toString() + '">download file</a><br>'+
		'<video controls="controls" src="/file/' + fileId.toString() + '"></video>');
	});

	req.pipe(busboy);
});

app.get('/file/:id', function(req, res) {
	// check if file exists : https://www.npmjs.com/package/gridfs-stream#check-if-file-exists
	// res.redirect('/dashboard');
	var options = {_id: req.params.id, root: bucketName};//{filename : 'mongo_file.txt'}; //can be done via _id as well
	gfs.exist(options, function (err, found) {
	if (err) {
		return handleError(err); 
	}

	if (!found) {
		console.log('Error on the database looking for the file.');
	}

	// We only get here if the file actually exists, so pipe it to the response
	//gfs.createReadStream({ _id: id }).pipe(res);

	found ? console.log('File exists') : console.log('File does not exist');
		console.log('File Found : ', found);
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
			return res.status(404).send('File not found.');
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

app.get('/busboy/disk/temp', function(req, res) {
	// show a file upload form
	res.writeHead(200, {'content-type': 'text/html'});
	res.end(
		'<form action="/busboy/disk/temp/file" enctype="multipart/form-data" method="post">'+
		'<input type="file" name="file"><br>'+
		'<input type="submit" value="Upload">'+
		'</form>'
	);
});
app.post('/busboy/disk/temp/file', function(req, res) {
	if (req.method === 'POST') {
		var busboy = new Busboy({ headers: req.headers });
		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			console.log('File ['+ fieldname +']: filename: '+ filename +', encoding: '+ encoding +', mimetype: '+ mimetype);

			var datetimestamp = Date.now();
			console.log('datetimestamp : ', datetimestamp, ' file.fieldname : ', filename.split('.')[0]);
			var saveTo = path.join(os.tmpDir(), path.basename( filename.split('.')[0] ));
			console.log('file Path : ', saveTo);
			var filePath = saveTo + '-' + datetimestamp + '.' + filename.split('.')[filename.split('.').length -1];
			console.log('file Path : ', filePath);
			file.pipe(fs.createWriteStream( filePath ));
		});
		busboy.on('finish', function() {
			res.writeHead(200, { 'Connection': 'close' });
			res.end("That's all folks!");
		});
		return req.pipe(busboy);
	}
	res.writeHead(404);
	res.end();
});

app.get('/busboy/disk/currentUplaodDir', function(req, res) {
	// show a file upload form
	res.writeHead(200, {'content-type': 'text/html'});
	res.end(
		'<form action="/busboy/disk/currentUplaodDir/file" enctype="multipart/form-data" method="post">'+
		'<input type="file" name="file"><br>'+
		'<input type="submit" value="Upload">'+
		'</form>'
	);
});
/*
https://www.npmjs.com/package/mkdirp
mkdirp « Create a new directory and any necessary subdirectories at dir with octal permission string

var path = require("path");
__dirname (or) ./
It gives you the full path of the directory containing the current running script.
*/
app.post('/busboy/disk/currentUplaodDir/file', function(req, res) {
	if (req.method === 'POST') {
		var busboy = new Busboy({ headers: req.headers });
		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			console.log('File ['+ fieldname +']: filename: '+ filename +', encoding: '+ encoding +', mimetype: '+ mimetype);

			var datetimestamp = Date.now();

			var tempPath = os.tmpDir(), currentDir = path.basename(__dirname), saveFileDirecotory = './uploads';
			console.log('datetimestamp : ', datetimestamp, 'tempPath : ', tempPath, ' currentDir : ', currentDir);

			console.log("./ = %s", path.resolve("./"));
			console.log("__dirname = %s", path.resolve(__dirname));

			mkdirp(saveFileDirecotory, function (err) {
				if (err) {
					console.error(err);
				} else {
					console.log('pow!');
				}
			});

			var saveTo = path.join(saveFileDirecotory, path.basename( filename.split('.')[0] ));
			console.log('file Path : ', saveTo);
			var filePath = saveTo + '-' + datetimestamp + '.' + filename.split('.')[filename.split('.').length -1];
			console.log('file Path : ', filePath);
			file.pipe(fs.createWriteStream( filePath ));
		});
		busboy.on('finish', function() {
			res.writeHead(200, { 'Connection': 'close' });
			res.end("That's all folks!");
		});
		return req.pipe(busboy);
	}
	res.writeHead(404);
	res.end();
});

app.get('/foldersList', function(req, res) {
	console.log("Connected correctly to server");

	var datetimestamp = Date.now();
	var tempPath = os.tmpDir(), currentDir = path.basename(__dirname);

	console.log("./ = %s", path.resolve("./"));
	console.log("__dirname = %s", path.resolve(__dirname));

	mkdirp('./uploads', function (err) {
		if (err) {
			console.error(err);
		} else {
			console.log('pow!');
		}
	});

	var respMssg = 
		'<P>datetimestamp : '+datetimestamp+'<\p>'+
		'<p>tempPath : '+tempPath+'</P>'+
		'<P>currentDir : '+currentDir+'</P>';
	console.log(respMssg);
	res.writeHead(200, {'content-type': 'text/html'});
	res.end( respMssg );
});