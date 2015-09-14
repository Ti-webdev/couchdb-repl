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

var soruceDb = PouchDB(sourceUrl + '/_all_dbs', {
    skipSetup: true
  });

soruceDb.request({
    url: ''
  })
  .then(function(dbs) {
    return dbs.filter(function (db) {
      return !/^_/.test(db);
    });
  })
  .then(function(dbs) {
    return PouchDB(targetUrl + '/_session')
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
    return PouchDB(targetUrl + '/_replicator')
      .bulkDocs(docs);
  })
  // .then(function (result) {
  //   console.log(result);
  // })
  .catch(function (err) {
    console.error(err);
    process.exit(-1);
  });
