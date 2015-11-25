FROM node:4.0.0
MAINTAINER docker-fauxton@3apaxi.com
ENV COUCHDB_REPL_VERSION=1.0.0
RUN npm install --no-optional --only=production --quiet --global --no-color couchdb-repl@$COUCHDB_REPL_VERSION
CMD ["sh", "-c", "couchdb-repl $SOURCE $TARGET --create --continuous --verbose --security --dbs $DBS"]
