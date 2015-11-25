# couchdb-repl
Node version couchdb-repl

# Installation
npm install -g couchdb-repl


# Usage:
```
couchdb-repl http://source:5984 http://target:5984 --create --continuous --verbose --dbs=recipes,menus --security
```

# Docker
```
docker run --rm -ti 3apaxicom/couchdb-repl couchdb-repl http://source:5984 http://target:5984 --create --continuous --verbose --dbs=recipes,menus --security
```

# Docker ENV (with --create and --continuous)
```
docker run --rm -ti -e SOURCE=http://source:5984 -e TARGET=http://target:5984 -e DBS=recipes,menus 3apaxicom/couchdb-repl
```
