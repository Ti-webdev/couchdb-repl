#!/usr/bin/env node

const yargs = require('yargs')

const PouchDB = require('pouchdb-core')
  .plugin(require('pouchdb-adapter-http'))
  .plugin(require('pouchdb-replication'))

if (yargs.boolean('version').argv.version) {
  console.log(require('../package.json').version);
  process.exit(0);
}

const argv = yargs
    .usage('Usage: $0 <source> <target> [options]')
    .demand(2, 2, '<source> <target> is required')
    .boolean(['create', 'continuous', 'security', 'verbose', 'version', 'system'])

    .describe('dbs', 'databases to replicate, separated by a comma')
    .describe('exclude', 'list of exclude databases')
    .describe('system', 'do not skip system databases like _users, _replicator')
    .describe('create', 'create databases before replicate')
    .describe('continuous', 'use continuous replication')
    .describe('security', 'copy databases security')
    .describe('filter', 'replication filter')
    .describe('query', 'JSON Object containing properties that are passed to the filter function')
    .describe('directly', 'replicate immediately')
    .describe('verbose', 'explain what is being done')
    .describe('version', 'show current version and exit')
    .describe('tpl-doc-id', 'template for replicator document ids e.g. source→target:%DB%')

    .alias('v', 'verbose')

    .env('REPL')

    .argv


const sourceUrl = String(argv._[0]).replace(/\/+$/, '')
const targetUrl = String(argv._[1]).replace(/\/+$/, '')

// --filter
// --query
const addReplicationOptions = function (options) {
  if (argv.filter) {
    options.filter = argv.filter
  }
  if (argv.query) {
    options.query_params = JSON.parse(argv.query)
  }
  return options
}

let db = PouchDB(sourceUrl + '/_all_dbs', {skipSetup: true, ajax: {timeout: 120000}})
Promise.resolve()
  .then(function () {
    // --dbs=db1,db2,db3
    if (argv.dbs) {
      return argv.dbs.split(/\s*,\s*/)
    }
    return db
      .request({
          url: ''
        })
  })
  // --exclude=db1,db2,db3
  .then(function(dbs) {
    if (argv.exclude) {
      const filterDbs = argv.exclude.split(/\s*,\s*/)
      return dbs.filter(function(db) {
        return -1 === filterDbs.indexOf(db)
      })
    }
    else {
      return dbs
    }
  })
  // --system
  .then(function(dbs) {
    if (argv.system) {
      return dbs
    }
    else {
      return dbs.filter(function (db) {
        return !/^_/.test(db)
      })
    }
  })
  // --create
  .then(function (dbs) {
    if (argv.create) {
      return dbs.reduce(function (queue, db) {
        return queue.then(function () {
          return PouchDB(targetUrl + '/' + db, {skipSetup: true})
            .request({
              url: '',
              method: 'PUT'
            })
            .then(function () {
              if (argv.verbose) console.log('db created:\t' + db)
            },function(err) {
              if ('file_exists' !== err.name) throw err
              if (argv.verbose) console.log('db exists:\t' + db)
            })
        })
      }, Promise.resolve())
        .then(function () {
          return dbs
        })
    }
    else {
      return dbs
    }
  })
  // security
  .then(function (dbs) {
    if (argv.security) {
      return dbs.reduce(function(queue, db) {
        return queue.then(function () {
          return PouchDB(sourceUrl + '/' + db, { skipSetup: true})
            .request({
              url: '_security'
            })
            .then(function (security) {
              if (argv.verbose) {
                console.log(db + '/_security:\t', security)
              }
              return PouchDB(targetUrl + '/' + db, { skipSetup: true})
                .request({
                  url: '_security',
                  method: 'PUT',
                  body: security
                })
            })
        })
      }, Promise.resolve())
      .then(function () {
        return dbs
      })
    }
    else {
      return dbs
    }
  })
  // --directly
  .then(function (dbs) {
    if (argv.directly) {
      return dbs.reduce(function(queue, db) {
        return queue.then(function () {
          return PouchDB.replicate(sourceUrl + '/' + db, targetUrl + '/' + db, addReplicationOptions({}))
            .then(function () {
              if (argv.verbose) {
                console.log(db + ' replicated')
              }
            })
        })
      }, Promise.resolve())
      .then(function () {
        return dbs
      })
    }
    else {
      return dbs
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
            user_ctx: session.userCtx || {roles: ['_admin']}
          }
        })
      })
  })
  // --tpl-doc-id
  // --filter
  // --query
  .then(function (docs) {
      docs.forEach(function (doc) {
        if (argv.tplDocId) {
          doc._id = argv.tplDocId.replace(/%DB%/gi, doc.target)
        }
        addReplicationOptions(doc)
      })
    return docs
  })

  // put
  .then(function (docs) {
    return PouchDB(targetUrl + '/_replicator', {
      skipSetup: true
    })
      .bulkDocs(docs)
  })
  .then(function (result) {
    if (argv.verbose) {
      console.log(result)
    }
  })
  .catch(function (err) {
    console.error(err)
    console.error(err.stack)
    process.exit(-1)
  })
