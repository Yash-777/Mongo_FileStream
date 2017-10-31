var express = require('express'); // 4.12.3
var mongo = require('mongodb'); // 2.0.31
var Grid = require('gridfs-stream'); // 1.1.1"
var app = express();
app.listen(9002);

var mongoHost = '127.0.0.1', mongoPort = 27017;
var user = 'mongoDBUser', password = 'mongoDBPassword';

var db = new mongo.Db('javaapps', new mongo.Server(mongoHost, mongoPort));
var gfs;
db.open(function(err, db) {

	if(!err) {
		console.log("Connected to database");
		db.authenticate(user, password, function(err, res) {
			if(!err) {
				console.log("Authenticated");
				gfs = Grid(db, mongo);
			} else {
				console.log("Error in authentication.");
				console.log(err);
			}
		});
	} else {
		console.log("Error in open().");
		console.log(err);
		throw err;
	};
});

app.get('/fileImages/:id', function(req, res) {
	var bucketName = 'automation_images';
	
	gfs.exist({_id: req.params.id, root: bucketName}, function (err, found) {
		if (err) {
			return handleError(err);
		}
		found ? console.log('File exists') : console.log('File does not exist');
		console.log('File Found : ', found);
	});

	gfs.findOne({ _id: req.params.id, root: bucketName }, function (err, file) {
		console.log('got a req with id: ', req.params.id);
		if (err) {
			return res.status(400).send(err);
		}
		if (!file) {
			return res.status(404).send('');
		}

		res.set('Content-Type', file.contentType);
		res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');

		var readstream = gfs.createReadStream({
			_id: file._id,
			root: bucketName
		}).pipe(res);

		readstream.on("error", function(err) {
			console.log("Got error while processing stream " + err.message);
			res.end();
		}).pipe(res);
	});
});
app.get('/fileVideos/:id', function(req, res) {
	var bucketName = 'automation_videos';
	gfs.exist({_id: req.params.id, root: bucketName}, function (err, found) {
		if (err) {
			return handleError(err);
		}
		found ? console.log('File exists') : console.log('File does not exist');
		console.log('File Found : ',found);
	});

	gfs.findOne({ _id: req.params.id, root: bucketName}, function (err, file) {
		console.log('got a req with id: ', req.params.id);
		if (err) {
			return res.status(400).send(err);
		}
		if (!file) {
			return res.status(404).send('File not found.');
		}
		res.set('Content-Type', file.contentType);
		res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');

		var readstream = gfs.createReadStream({
			_id: file._id,
			root: bucketName
		});

		readstream.on("error", function(err) {
			console.log("Got error while processing stream " + err.message);
			res.end();
		});

		readstream.pipe(res);
	});
});