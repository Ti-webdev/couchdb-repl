#!/usr/bin/env node

var PouchDB = require('pouchdb');
var assert = require('assert');
var argv = require('minimist')(process.argv.slice(2));

var sourceUrl = String(argv._[0]).replace(/\/+$/, '');
var targetUrl = String(argv._[1]).replace(/\/+$/, '');

PouchDB(sourceUrl + '/_all_dbs', {
    skipSetup: true
  })
  .request({
      url: ''
    })
  // --dbs
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
  // --create
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
  // security
  .then(function (dbs) {
    if (argv.security) {
      var queue = Promise.resolve();
      dbs.forEach(function(db) {
        queue = queue.then(function () {
          return PouchDB(sourceUrl + '/' + db, { skipSetup: true})
            .request({
              url: '_security'
            })
            .then(function (security) {
              if (argv.verbose) {
                console.log(db + '/_security:\t', security);
              }
              return PouchDB(targetUrl + '/' + db, { skipSetup: true})
                .request({
                  url: '_security',
                  method: 'PUT',
                  body: security
                });
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
  // repl docs
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
  // put
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
