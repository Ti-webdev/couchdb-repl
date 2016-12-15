FROM node:7.2.1
MAINTAINER docker-repl@3apaxi.com
ENV COUCHDB_REPL_VERSION=2.0.5
RUN npm install --no-optional --only=production --quiet --global --no-color couchdb-repl@$COUCHDB_REPL_VERSION
CMD ["sh", "-c", "couchdb-repl $SOURCE $TARGET --create --continuous --verbose --security --dbs $DBS"]
