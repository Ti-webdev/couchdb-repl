#!/usr/bin/env node

const yargs = require('yargs')

if (yargs.boolean('version').argv.version) {
  console.log(require('../package.json').version);
  process.exit(0);
}

const argv = yargs
    .usage('Usage: $0 <source> <target> [options]')
    .demand(2, 2, '<source> <target> is required')
    .boolean(['create', 'continuous', 'security', 'verbose', 'version', 'system'])

    .describe('db', 'database to replicate can be set multiple times').array('db')
    .describe('dbs', 'databases to replicate, separated by a comma')
    .describe('exclude', 'list of exclude databases')
    .describe('system', 'do not skip system databases like _users, _replicator')
    .describe('create', 'create databases before replicate')
    .describe('continuous', 'use continuous replication')
    .describe('security', 'copy databases security')
    .describe('filter', 'replication filter')
    .describe('query', 'JSON Object containing properties that are passed to the filter function')
    .describe('doc', 'doc_ids, can be set multiple times').array('doc')
    .describe('directly', 'replicate immediately')
    .describe('verbose', 'explain what is being done')
    .describe('version', 'show current version and exit')
    .describe('tpl-doc-id', 'template for replicator document ids e.g. source→target:%DB%')

    .alias('v', 'verbose')

    .env('REPL')

    .argv

const PouchDB = require('pouchdb-core')
  .plugin(require('pouchdb-adapter-http'))
  .plugin(require('pouchdb-replication'))

async function main () {
  const sourceURL = String(argv._[0]).replace(/\/+$/, '')
  const targetURL = String(argv._[1]).replace(/\/+$/, '')

  const addReplicationOptions = function (options) {
    // --filter
    if (argv.filter) {
      options.filter = argv.filter
    }
    // --query
    if (argv.query) {
      options.query_params = JSON.parse(argv.query)
    }
    if (argv.doc) {
      options.doc_ids = Array.isArray(argv.doc) ? argv.doc : [argv.doc]
    }
    return options
  }

  const db = new PouchDB(sourceURL + '/_all_dbs', {skipSetup: true, ajax: {timeout: 120000}})
  let dbs

  // --dbs=db1,db2,db3
  if (argv.dbs) {
    dbs = argv.dbs.split(/\s*,\s*/)
  } else if (argv.db) {
    dbs = Array.isArray(argv.db) ? argv.db : [argv.db]
  } else {
    dbs = await db.request({ url: '' })
  }

  // --exclude=db1,db2,db3
  if (argv.exclude) {
    const filterDbs = argv.exclude.split(/\s*,\s*/)
    dbs = dbs.filter(db => !filterDbs.includes(db))
  }
  // --system
  if (!argv.system) {
    dbs = dbs.filter(db => !/^_/.test(db))
  }

  for (let db of dbs) {
    const sourceDB = new PouchDB(`${sourceURL}/${db}`, { skipSetup: true })
    const targetDB = new PouchDB(`${targetURL}/${db}`, { skipSetup: true })
    // --create
    if (argv.create) {
      try {
        await targetDB.request({ url: '', method: 'PUT' })
        if (argv.verbose) console.log('db created:\t' + db)
      } catch (e) {
        if ('file_exists' !== e.name) throw err
        if (argv.verbose) console.log('db exists:\t' + db)
      }
    }
    // --security
    if (argv.security) {
      const security = await sourceDB.request({ url: '_security' })
      if (argv.verbose) console.log(db + '/_security:\t', security)
      await targetDB.request({
        url: '_security',
        method: 'PUT',
        body: security
      })
    }
    // --directly
    if (argv.directly) {
      await sourceDB.replicate.to(targetDB, addReplicationOptions({}))
      if (argv.verbose) {
        console.log(db + ' replicated')
      }
    }
  }
  if (argv.directly) {
    return
  }
  // repl docs
  const sessionDB = new PouchDB(targetURL + '/_session', { skipSetup: true })
  const session = await sessionDB.request({ url: '' })
  const docs = dbs.map(db => {
    const doc = {
      source: sourceURL + '/' + db,
      target: db,
      create: Boolean(argv.create),
      continuous: Boolean(argv.continuous),
      user_ctx: session.userCtx || {roles: ['_admin']}
    }
    // --tpl-doc-id
    if (argv.tplDocId) {
      doc._id = argv.tplDocId.replace(/%DB%/gi, doc.target)
    }
    // --filter
    // --query
    addReplicationOptions(doc)
    return doc
  })
  const replicatorDB = new PouchDB(targetURL + '/_replicator', { skipSetup: true })
  const result = await replicatorDB.bulkDocs(docs)
  if (argv.verbose) {
    console.log(result)
  }
}
main().catch(error => {
  console.error(error)
  console.error(error.stack)
  process.exit(-1)
})
