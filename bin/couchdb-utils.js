#!/usr/bin/env node

var PouchDB = require('pouchdb');
var assert = require('assert');
var argv = require('minimist')(process.argv.slice(2));

assert.equal('rep', argv._[0]);
assert.equal('host', argv._[1]);
assert(argv.host);

var targetUrl = String(argv.host).replace(/\/+$/, '');
var sourceUrl = String(argv._[2]).replace(/\/+$/, '');
//
// console.log(argv);
// return console.log(sourceUrl, targetUrl);

PouchDB(sourceUrl + '/_all_dbs', {
    skipSetup: true
  })
  .request({
      url: ''
    })
  .then(function(dbs) {
    if (argv.dbs) {
      var filterDbs = argv.dbs.split(/\s*,\s*/);
      return dbs.filter(function(db) {
        return -1 !== filterDbs.indexOf(db);
      });
    }
    else {
      return dbs.filter(function (db) {
        return !/^_/.test(db);
      });
    }
  })
  .then(function (dbs) {
    if (argv.create) {
      var queue = Promise.resolve();
      dbs.forEach(function(db) {
        queue = queue.then(function () {
          return PouchDB(targetUrl + '/' + db, { skipSetup: true})
            .request({
              url: '',
              method: 'PUT'
            })
            .then(function () {
              if (argv.verbose) console.log('db created:\t' + db);
            },function(err) {
              if ('file_exists' !== err.name) throw err;
              if (argv.verbose) console.log('db exists:\t' + db);
            });
        });
      });
      return queue.then(function () {
        return dbs;
      });
    }
    else {
      return dbs;
    }
  })
  .then(function(dbs) {
    return PouchDB(targetUrl + '/_session', {
      skipSetup: true
    })
      .request({
        url: ''
      })
      .then(function (session) {
        return dbs.map(function (db) {
          return {
            source: sourceUrl + '/' + db,
            target: db,
            create: Boolean(argv.create),
            continuous: Boolean(argv.continuous),
            user_ctx: session.userCtx
          }
        });
      });
  })
  .then(function (docs) {
    return PouchDB(targetUrl + '/_replicator', {
      skipSetup: true
    })
      .bulkDocs(docs);
  })
  .then(function (result) {
    if (argv.verbose) {
      console.log(result);
    }
  })
  .catch(function (err) {
    console.error(err);
    console.error(err.stack);
    process.exit(-1);
  });
