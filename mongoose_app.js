var express = require('express');
var app = express();

var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');


app.use(bodyParser.json());

var MyModel = require('./models/bsonRecord.js');

// Connect to Mongoose open the connection untill the server stops
mongoose.connect('mongodb://localhost/myDataBase');
var db = mongoose.connection;

// Routes
app.get('/', function(req, res){
	res.send('Hello World! - Yash');
});

app.get('/app/getCollectionData', function(req, res){
	MyModel.getMyModel( function(err, mydatacollection){
		if(err){
			throw err;
		} 
		res.json( mydatacollection );
	});
});

app.listen(8077);
console.log('Running on Port 8077...');