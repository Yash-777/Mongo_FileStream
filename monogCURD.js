var http = require('http'),
	express = require('express'),
	app = express(),
	nodeserver = app.listen(9002);
console.log('Running on Port 9002...');

var Busboy = require('busboy'); // 0.2.9 - for files

var path = require('path'),
	os = require('os'),
	fs = require('fs');

var mkdirp = require('mkdirp');

var mongo = require('./CRUD_operations/mysql_connection.js')
var db = mongo.getDB;
var gfs =  mongo.getGFS;


var insertDocuments = function(db, callback) {
	// Get the documents collection
	var collection = db.collection('documents');

	// Insert some documents
	collection.insertMany([
		{a : 1}, {a : 2}, {a : 3}
		], function(err, result) {
		console.log("Inserted 3 documents into the document collection");
		callback(result);
	});
};

var updateDocument = function(db, callback) {
	// Get the documents collection
	var collection = db.collection('documents');
	// Update document where a is 2, set b equal to 1
	collection.updateOne({ a : 1 }, { $set: { a : 4 } }, function(err, result) {
		console.log("Updated the document with the field a equal to 2");
		callback(result);
	});
};

var deleteDocument = function(db, callback) {
	// Get the documents collection
	var collection = db.collection('documents');
	// Insert some documents
	collection.deleteOne({ a : 3 }, function(err, result) {
		console.log("Removed the document with the field a equal to 3");
		callback(result);
	});
};

app.post('/mongodb/file', function(req, res) {
	var busboy = new Busboy({ headers : req.headers });
	var fileId = new mongodb.ObjectId();

	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);

		console.log('gfs : ', gfs);
		var writeStream = gfs.createWriteStream({
			_id: fileId,
			filename: filename,
			mode: 'w',
			content_type: mimetype,
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

/*
https://www.npmjs.com/package/mkdirp
mkdirp « Create a new directory and any necessary subdirectories at dir with octal permission string

var path = require("path");
__dirname (or) ./
It gives you the full path of the directory containing the current running script.
*/
app.post('/disk/busboy/file', function(req, res) {
	if (req.method === 'POST') {
		var busboy = new Busboy({ headers: req.headers });
		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
			
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

app.get('/disk/busboy', function(req, res) {
	// show a file upload form
	res.writeHead(200, {'content-type': 'text/html'});
	res.end(
			'<form action="/disk/busboy/file" enctype="multipart/form-data" method="post">'+
			'<input type="file" name="file"><br>'+
			'<input type="submit" value="Upload">'+
			'</form>'
	);
});

app.get('/dboprations', function(req, res) {
	console.log("Connected correctly to server");

	insertDocuments(db, function() {
		updateDocument(db, function() {
			deleteDocument(db, function() {
				db.close();
			});
		});
	});
	
	res.writeHead(200, {'content-type': 'text/html'});
	res.end('Performned DB CURD Operations.');
});

app.get('/file/:id', function(req, res) {
	console.log('gfs : ', gfs);
	gfs.findOne({ _id: req.params.id }, function (err, file) {
		console.log('Requested with ID : ', req.params.id );
		if (err) {
			return res.status(400).send(err);
		}
		if (!file) {
			return res.status(404).send('');
		}

		res.set('Content-Type', file.contentType);
		res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');

		var readstream = gfs.createReadStream({
			_id: file._id
		});

		readstream.on("error", function(err) {
			console.log("Got error while processing stream " + err.message);
			res.end();
		});

		readstream.pipe(res);
	});
});



app.get('/test', function(req, res) {
	console.log("Connected correctly to server");
	
	var datetimestamp = Date.now();
	var tempPath = os.tmpDir(), currentDir = path.basename(__dirname);
	
	var respMssg = 'datetimestamp : '+datetimestamp+'tempPath : '+tempPath+' currentDir : '+currentDir;
	console.log(respMssg);
	
	updateDocument(db, function() {
		console.log('Updating data');
		db.close();
	});

	res.writeHead(200, {'content-type': 'text/html'});
	res.end( respMssg );
});