var mongoose = require('mongoose');

// My Collection Schema - like a ble print for collection fields
var myCollectionSchema = mongoose.Schema({
	name : {
		type: String, default: 'hahaha', require:true
	},
	age:{
		type: String, require:true
	},
	created_date:{
		type:Date, default:Date.now
	}
}, {collection:'mydatacollection'});

var MyModel = module.exports = mongoose.model('mydatacollection', myCollectionSchema);

// Get method for the `MyExportCollectionKey` variable value, callback function
module.exports.getMyModel = function(callback, limit) {
	MyModel.find(callback).limit(limit);
};