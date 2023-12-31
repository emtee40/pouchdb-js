'use strict';

var adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

adapters.forEach(function (adapters) {
  var title = 'test.sync_events.js-' + adapters[0] + '-' + adapters[1];
  describe('suite2 ' + title, function () {

    var dbs = {};

    beforeEach(function () {
      dbs.name = testUtils.adapterUrl(adapters[0], 'testdb');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_repl_remote');
    });

    afterEach(function (done) {
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    it('#4251 Should fire paused and active on sync', function (done) {

      var db = new PouchDB(dbs.name);
      var remote = new PouchDB(dbs.remote);

      db.bulkDocs([{_id: 'a'}, {_id: 'b'}]).then(function () {

        var repl = db.sync(remote, {retry: true, live: true});
        var counter = 0;

        repl.on('complete', function () {
          done();
        });

        repl.on('active', function () {
          counter++;
          if (counter === 1) {
            // We are good, initial replication
          } else if (counter === 3) {
            remote.bulkDocs([{_id: 'e'}, {_id: 'f'}]);
          }
        });

        repl.on('paused', function () {
          counter++;
          if (counter === 1) {
            // Maybe a bug, if we have data should probably
            // call active first
            counter--;
          } if (counter === 2) {
            db.bulkDocs([{_id: 'c'}, {_id: 'd'}]);
          } else if (counter === 4) {
            repl.cancel();
          }
        });
      });

    });

    it('#5710 Test pending property support', function (done) {

      var db = new PouchDB(dbs.name);
      var remote = new PouchDB(dbs.remote);
      var docId = 0;
      var numDocs = 10;

      function generateDocs(n) {
        return Array.apply(null, new Array(n)).map(function () {
          docId += 1;
          return {
            _id: docId.toString(),
            foo: Math.random().toString()
          };
        });
      }
      remote.bulkDocs(generateDocs(numDocs)).then(function () {
        var repl = db.sync(remote, { retry: true, live: false, batch_size: 4 });
        var pendingSum = 0;

        repl.on('change', function (info) {
          if (typeof info.change.pending === 'number') {
            pendingSum += info.change.pending;
            if (info.change.pending === 0) {
              pendingSum += info.change.docs.length;
            }
          }
        });

        repl.on('complete', function () {
          if (pendingSum > 0) {
            pendingSum.should.equal(numDocs);
          }
          done();
        });
      });
    });
  });
});
