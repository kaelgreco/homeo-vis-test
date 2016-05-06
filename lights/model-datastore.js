'use strict';

var gcloud = require('gcloud');
var config = require('../config');

// Datastore configuration
var ds = gcloud.datastore({
  projectId: config.get('GCLOUD_PROJECT')
});
var kind = 'HueStateData';

// Translates from Datastore's entity format to
// the format expected by the application.
//
// Datastore format:
//   {
//     key: [kind, id],
//     data: {
//       property: value
//     }
//   }
//
// Application format:
//   {
//     id: id,
//     property: value
//   }
function fromDatastore (obj) {
  obj.data.id = obj.key.id;
  return obj.data;
}

// Translates from the application's format to the datastore's
// extended entity property format. It also handles marking any
// specified properties as non-indexed. Does not translate the key.
//
// Application format:
//   {
//     id: id,
//     property: value,
//     unindexedProperty: value
//   }
//
// Datastore extended format:
//   [
//     {
//       name: property,
//       value: value
//     },
//     {
//       name: unindexedProperty,
//       value: value,
//       excludeFromIndexes: true
//     }
//   ]
function toDatastore (obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  var results = [];
  Object.keys(obj).forEach(function (k) {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1
    });
  });
  return results;
}

// Lists all hue data entries in the Datastore sorted alphabetically
// by title.
function list (limit, callback) {
  var q = ds.createQuery([kind])
    .limit(limit)
    .order('id', {descending: true});

  ds.runQuery(q, function (err, entities, nextQuery) {
    if (err) {
      return callback(err);
    }
    var hasMore = entities.length === limit ? nextQuery.startVal : false;
    callback(null, entities.map(fromDatastore), hasMore);
  });
}


module.exports = {
  create: function (data, callback) {
    update(null, data, callback);
  },
  list: list
};
