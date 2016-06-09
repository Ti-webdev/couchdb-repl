# couchdb-repl
Node version couchdb-repl

# Installation
npm install -g couchdb-repl


# Usage:
```
couchdb-repl http://source:5984 http://target:5984 --create --continuous --verbose --dbs=recipes,menus --security
```

# OPTIONS
```
--dbs          databases to replicate, separated by a comma
--exclude      list of exclude databases
--system       do not skip system databases like _users, _replicator [boolean]
--create       create databases before replicate                     [boolean]
--continuous   use continuous replication                            [boolean]
--security     copy databases security                               [boolean]
--filter       replication filter
--query        JSON Object containing properties that are passed to the filter function
--directly     replicate immediately
--tpl-doc-id   template for replicator document ids e.g. source→target:%DB%
-v, --verbose  explain what is being done                            [boolean]
```

# ENVIRONMENTS
You can use these environment variable instead of CLI arguments
 * REPL_DBS
 * REPL_EXCLUDE
 * REPL_SYSTEM
 * REPL_CREATE
 * REPL_CONTINUOUS
 * REPL_SECURITY
 * REPL_FILTER
 * REPL_QUERY
 * REPL_DIRECTLY
 * REPL_TPL_DOC_ID
 * REPL_VERBOSE

# Docker
```
docker run --rm -ti 3apaxicom/couchdb-repl couchdb-repl http://source:5984 http://target:5984 --create --continuous --verbose --dbs=recipes,menus --security
```
