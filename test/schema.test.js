/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , Document = mongoose.Document
  , SchemaType = mongoose.SchemaType
  , VirtualType = mongoose.VirtualType
  , ValidatorError = mongoose.Error.ValidatorError
  , SchemaTypes = Schema.Types
  , ObjectId = SchemaTypes.ObjectId
  , Mixed = SchemaTypes.Mixed
  , DocumentObjectId = mongoose.Types.ObjectId
  , MongooseArray = mongoose.Types.Array
  , ReadPref = mongoose.mongo.ReadPreference
  , vm = require('vm')

/**
 * Test Document constructor.
 */

function TestDocument () {
  Document.apply(this, arguments);
};

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Set a dummy schema to simulate compilation.
 */

TestDocument.prototype.$__setSchema(new Schema({
    test    : String
}));

/**
 * Test.
 */

describe('schema', function(){
  it('can be created without the "new" keyword', function(done){
    var schema = Schema({ name: String });
    assert.ok(schema instanceof Schema);
    done();
  })

  it('supports different schematypes', function(done){
    var Checkin = new Schema({
        date      : Date
      , location  : {
            lat: Number
          , lng: Number
        }
    });

    var Ferret = new Schema({
        name      : String
      , owner     : ObjectId
      , fur       : String
      , color     : { type: String }
      , age       : Number
      , checkins  : [Checkin]
      , friends   : [ObjectId]
      , likes     : Array
      , alive     : Boolean
      , extra     : Mixed
    });

    assert.ok(Ferret.path('name') instanceof SchemaTypes.String);
    assert.ok(Ferret.path('owner') instanceof SchemaTypes.ObjectId);
    assert.ok(Ferret.path('fur') instanceof SchemaTypes.String);
    assert.ok(Ferret.path('color') instanceof SchemaTypes.String);
    assert.ok(Ferret.path('age') instanceof SchemaTypes.Number);
    assert.ok(Ferret.path('checkins') instanceof SchemaTypes.DocumentArray);
    assert.ok(Ferret.path('friends') instanceof SchemaTypes.Array);
    assert.ok(Ferret.path('likes') instanceof SchemaTypes.Array);
    assert.ok(Ferret.path('alive') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret.path('extra') instanceof SchemaTypes.Mixed);

    assert.strictEqual(Ferret.path('unexistent'), undefined);

    assert.ok(Checkin.path('date') instanceof SchemaTypes.Date);

    // check strings
    var Checkin1 = new Schema({
        date      : 'date'
      , location  : {
            lat: 'number'
          , lng: 'Number'
        }
    });

    assert.ok(Checkin1.path('date') instanceof SchemaTypes.Date);
    assert.ok(Checkin1.path('location.lat') instanceof SchemaTypes.Number);
    assert.ok(Checkin1.path('location.lng') instanceof SchemaTypes.Number);

    var Ferret1 = new Schema({
        name      : "string"
      , owner     : "oid"
      , fur       : { type: "string" }
      , color     : { type: "String" }
      , checkins  : [Checkin]
      , friends   : Array
      , likes     : "array"
      , alive     : "Bool"
      , alive1    : "bool"
      , alive2    : "boolean"
      , extra     : "mixed"
      , obj       : "object"
      , buf       : "buffer"
      , Buf       : "Buffer"
    });

    assert.ok(Ferret1.path('name') instanceof SchemaTypes.String);
    assert.ok(Ferret1.path('owner') instanceof SchemaTypes.ObjectId);
    assert.ok(Ferret1.path('fur') instanceof SchemaTypes.String);
    assert.ok(Ferret1.path('color') instanceof SchemaTypes.String);
    assert.ok(Ferret1.path('checkins') instanceof SchemaTypes.DocumentArray);
    assert.ok( Ferret1.path('friends') instanceof SchemaTypes.Array);
    assert.ok(Ferret1.path('likes') instanceof SchemaTypes.Array);
    assert.ok(Ferret1.path('alive') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret1.path('alive1') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret1.path('alive2') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret1.path('extra') instanceof SchemaTypes.Mixed);
    assert.ok(Ferret1.path('obj') instanceof SchemaTypes.Mixed);
    assert.ok(Ferret1.path('buf') instanceof SchemaTypes.Buffer);
    assert.ok(Ferret1.path('Buf') instanceof SchemaTypes.Buffer);
    done();
  });

  it('supports dot notation for path accessors', function(done){
    var Racoon = new Schema({
        name  : { type: String, enum: ['Edwald', 'Tobi'] }
      , age   : Number
    });

    // check for global variable leak
    assert.equal('undefined', typeof errorMessage);

    var Person = new Schema({
        name      : String
      , raccoons  : [Racoon]
      , location  : {
            city  : String
          , state : String
        }
    });

    assert.ok(Person.path('name') instanceof SchemaTypes.String);
    assert.ok(Person.path('raccoons') instanceof SchemaTypes.DocumentArray);
    assert.ok(Person.path('location.city') instanceof SchemaTypes.String);
    assert.ok(Person.path('location.state') instanceof SchemaTypes.String);

    assert.strictEqual(Person.path('location.unexistent'), undefined);
    done();
  })

  it('allows paths nested > 2 levels', function(done){
    var Nested = new Schema({
      first: {
        second: {
          third: String
        }
      }
    });
    assert.ok(Nested.path('first.second.third') instanceof SchemaTypes.String);
    done();
  });

  it('default definition', function(done){
    var Test = new Schema({
        simple    : { type: String, default: 'a' }
      , array     : { type: Array, default: [1,2,3,4,5] }
      , arrayX    : { type: Array, default: 9 }
      , arrayFn   : { type: Array, default: function () { return [8] } }
      , callback  : { type: Number, default: function(){
          assert.equal('b', this.a);
          return '3';
        }}
    });

    assert.equal(Test.path('simple').defaultValue, 'a');
    assert.equal(typeof Test.path('callback').defaultValue, 'function');

    assert.equal(Test.path('simple').getDefault(), 'a');
    assert.equal((+Test.path('callback').getDefault({ a: 'b' })), 3);
    assert.equal(typeof Test.path('array').defaultValue, 'function');
    assert.equal(Test.path('array').getDefault(new TestDocument)[3], 4);
    assert.equal(Test.path('arrayX').getDefault(new TestDocument)[0], 9);
    assert.equal(typeof Test.path('arrayFn').defaultValue, 'function');
    assert.ok(Test.path('arrayFn').getDefault(new TestDocument) instanceof MongooseArray);
    done();
  })

  it('Mixed defaults can be empty arrays', function(done){
    var Test = new Schema({
        mixed1    : { type: Mixed, default: [] }
      , mixed2    : { type: Mixed, default: Array }
    });

    assert.ok(Test.path('mixed1').getDefault() instanceof Array);
    assert.equal(Test.path('mixed1').getDefault().length, 0);
    assert.ok(Test.path('mixed2').getDefault() instanceof Array);
    assert.equal(Test.path('mixed2').getDefault().length, 0);
    done();
  })

  describe('casting', function(){
    it('number', function(done){
      var Tobi = new Schema({
          age: Number
      });

      // test String -> Number cast
      assert.equal('number', typeof Tobi.path('age').cast('0'));
      assert.equal(0, (+Tobi.path('age').cast('0')));

      assert.equal('number', typeof Tobi.path('age').cast(0));
      assert.equal(0, (+Tobi.path('age').cast(0)));
      done();
    });

    describe('string', function(){
      it('works', function(done){
        var Tobi = new Schema({
            nickname: String
        });

        function Test(){};
        Test.prototype.toString = function(){
          return 'woot';
        };

        // test Number -> String cast
        assert.equal('string', typeof Tobi.path('nickname').cast(0));
        assert.equal('0', Tobi.path('nickname').cast(0));

        // test any object that implements toString
        assert.equal('string', typeof Tobi.path('nickname').cast(new Test));
        assert.equal('woot', Tobi.path('nickname').cast(new Test));
        done();
      });
      it('casts undefined to "undefined"', function(done){
        var db= require('./common')();
        var schema = new Schema({ arr: [String] });
        var M = db.model('castingStringArrayWithUndefined', schema);
        M.find({ arr: { $in: [undefined] }}, function (err) {
          db.close();
          assert.equal(err && err.message, 'Cast to string failed for value "undefined" at path "arr"');
          done();
        });
      });
    });

    it('date', function(done){
      var Loki = new Schema({
          birth_date: { type: Date }
      });

      assert.ok(Loki.path('birth_date').cast(1294525628301) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('8/24/2000') instanceof Date);
      assert.ok(Loki.path('birth_date').cast(new Date) instanceof Date);
      done();
    });

    it('objectid', function(done){
      var Loki = new Schema({
          owner: { type: ObjectId }
      });

      var doc = new TestDocument()
        , id = doc._id.toString();

      assert.ok(Loki.path('owner').cast('4c54f3453e688c000000001a')
                        instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(new DocumentObjectId())
                        instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(doc)
                        instanceof DocumentObjectId);

      assert.equal(id, Loki.path('owner').cast(doc).toString());
      done();
    });

    it('array', function(done){
      var Loki = new Schema({
          oids        : [ObjectId]
        , dates       : [Date]
        , numbers     : [Number]
        , strings     : [String]
        , buffers     : [Buffer]
        , nocast      : []
        , mixed       : [Mixed]
      });

      var oids = Loki.path('oids').cast(['4c54f3453e688c000000001a', new DocumentObjectId]);

      assert.ok(oids[0] instanceof DocumentObjectId);
      assert.ok(oids[1] instanceof DocumentObjectId);

      var dates = Loki.path('dates').cast(['8/24/2010', 1294541504958]);

      assert.ok(dates[0] instanceof Date);
      assert.ok(dates[1] instanceof Date);

      var numbers = Loki.path('numbers').cast([152, '31']);

      assert.equal(typeof numbers[0], 'number');
      assert.equal(typeof numbers[1], 'number');

      var strings = Loki.path('strings').cast(['test', 123]);

      assert.equal(typeof strings[0], 'string');
      assert.equal('test',strings[0]);

      assert.equal(typeof strings[1], 'string');
      assert.equal('123', strings[1]);

      var buffers = Loki.path('buffers').cast(['\0\0\0', new Buffer("abc")]);

      assert.ok(buffers[0] instanceof Buffer);
      assert.ok(buffers[1] instanceof Buffer);

      var nocasts = Loki.path('nocast').cast(['test', 123]);

      assert.equal(typeof nocasts[0], 'string');
      assert.equal('test', nocasts[0]);

      assert.equal(typeof nocasts[1], 'number');
      assert.equal(123, nocasts[1]);

      var mixed = Loki.path('mixed').cast(['test', 123, '123', {}, new Date, new DocumentObjectId]);

      assert.equal(typeof mixed[0], 'string');
      assert.equal(typeof mixed[1], 'number');
      assert.equal(typeof mixed[2], 'string');
      assert.equal(typeof mixed[3], 'object');
      assert.ok(mixed[4] instanceof Date);
      assert.ok(mixed[5] instanceof DocumentObjectId);
      done();
    });

    it('boolean', function(done){
      var Animal = new Schema({
          isFerret: { type: Boolean, required: true }
      });

      assert.strictEqual(Animal.path('isFerret').cast(null), null);
      assert.equal(false, Animal.path('isFerret').cast(undefined));
      assert.equal(false, Animal.path('isFerret').cast(false));
      assert.equal(false, Animal.path('isFerret').cast(0));
      assert.equal(false, Animal.path('isFerret').cast('0'));
      assert.equal(false, Animal.path('isFerret').cast('false'));
      assert.equal(true, Animal.path('isFerret').cast({}));
      assert.equal(true, Animal.path('isFerret').cast(true));
      assert.equal(true, Animal.path('isFerret').cast(1));
      assert.equal(true, Animal.path('isFerret').cast('1'));
      assert.equal(true, Animal.path('isFerret').cast('true'));
      done();
    });
  });

  it('methods declaration', function(done){
    var a = new Schema;
    a.method('test', function(){});
    a.method({
        a: function(){}
      , b: function(){}
    });
    assert.equal(3, Object.keys(a.methods).length);
    done();
  });

  it('static declaration', function(done){
    var a = new Schema;
    a.static('test', function(){});
    a.static({
        a: function(){}
      , b: function(){}
      , c: function(){}
    });

    assert.equal(Object.keys(a.statics).length, 4)
    done();
  });

  describe('setters', function(){
    it('work', function(done){
      function lowercase (v) {
        return v.toLowerCase();
      };

      var Tobi = new Schema({
          name: { type: String, set: lowercase }
      });

      assert.equal('woot', Tobi.path('name').applySetters('WOOT'));
      assert.equal(1, Tobi.path('name').setters.length);

      Tobi.path('name').set(function(v){
        return v + 'WOOT';
      });

      assert.equal('wootwoot', Tobi.path('name').applySetters('WOOT'));
      assert.equal(2, Tobi.path('name').setters.length);
      done();
    });

    it('order', function(done){
      function extract (v, self) {
        return (v && v._id)
          ? v._id
          : v
      };

      var Tobi = new Schema({
          name: { type: Schema.ObjectId, set: extract }
      });

      var id = new DocumentObjectId
        , sid = id.toString()
        , _id = { _id: id };

      assert.equal(Tobi.path('name').applySetters(sid, { a: 'b' }).toString(),sid);
      assert.equal(Tobi.path('name').applySetters(_id, { a: 'b' }).toString(),sid);
      assert.equal(Tobi.path('name').applySetters(id, { a: 'b' }).toString(),sid);
      done();
    });

    it('scope', function(done){
      function lowercase (v, self) {
        assert.equal('b', this.a);
        assert.equal('name', self.path);
        return v.toLowerCase();
      };

      var Tobi = new Schema({
          name: { type: String, set: lowercase }
      });

      assert.equal('what', Tobi.path('name').applySetters('WHAT', { a: 'b' }));
      done();
    });

    it('casting', function(done){
      function last (v) {
        assert.equal('number', typeof v);
        assert.equal(0, v);
        return 'last';
      };

      function first (v) {
        return 0;
      };

      var Tobi = new Schema({
          name: { type: String, set: last }
      });

      Tobi.path('name').set(first);
      assert.equal('last', Tobi.path('name').applySetters('woot'));
      done();
    });

    describe('string', function(){
      it('lowercase', function(done){
        var Tobi = new Schema({
            name: { type: String, lowercase: true }
        });

        assert.equal('what', Tobi.path('name').applySetters('WHAT'));
        assert.equal('1977', Tobi.path('name').applySetters(1977));
        done();
      });
      it('uppercase', function(done){
        var Tobi = new Schema({
            name: { type: String, uppercase: true }
        });

        assert.equal('WHAT', Tobi.path('name').applySetters('what'));
        assert.equal('1977', Tobi.path('name').applySetters(1977));
        done();
      });
      it('trim', function(done){
        var Tobi = new Schema({
            name: { type: String, uppercase: true, trim: true }
        });

        assert.equal('WHAT', Tobi.path('name').applySetters('  what   '));
        assert.equal('1977', Tobi.path('name').applySetters(1977));
        done();
      });
    });

    it('applying when none have been defined', function(done){
      var Tobi = new Schema({
          name: String
      });

      assert.equal('woot', Tobi.path('name').applySetters('woot'));
      done();
    });

    it('assignment of non-functions throw', function(done){
      var schema = new Schema({ fun: String });
      var g, s;

      try {
        schema.path('fun').set(4);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message,'A setter must be a function.');
      done();
    })
  });

  describe('getters', function(){
    it('work', function(done){
      function woot (v) {
        return v + ' woot';
      };

      var Tobi = new Schema({
          name: { type: String, get: woot }
      });

      assert.equal(1, Tobi.path('name').getters.length);
      assert.equal('test woot', Tobi.path('name').applyGetters('test'));
      done();
    });
    it('order', function(done){
      function format (v, self) {
        return v
          ? '$' + v
          : v
      };

      var Tobi = new Schema({
          name: { type: Number, get: format }
      });

      assert.equal('$30', Tobi.path('name').applyGetters(30, { a: 'b' }));
      done();
    });
    it('scope', function(done){
      function woot (v, self) {
        assert.equal('b', this.a);
        assert.equal('name', self.path);
        return v.toLowerCase();
      };

      var Tobi = new Schema({
          name: { type: String, get: woot }
      });

      assert.equal('yep', Tobi.path('name').applyGetters('YEP', { a: 'b' }));
      done();
    });
    it('casting', function(done){
      function last (v) {
        assert.equal('number', typeof v);
        assert.equal(0, v);
        return 'last';
      };

      function first (v) {
        return 0;
      };

      var Tobi = new Schema({
          name: { type: String, get: last }
      });

      Tobi.path('name').get(first);
      assert.equal('last', Tobi.path('name').applyGetters('woot'));
      done();
    });
    it('applying when none have been defined', function(done){
      var Tobi = new Schema({
          name: String
      });

      assert.equal('woot', Tobi.path('name').applyGetters('woot'));
      done();
    });
    it('assignment of non-functions throw', function(done){
      var schema = new Schema({ fun: String });
      var g, s;

      try {
        schema.path('fun').get(true);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message,'A getter must be a function.');
      done();
    })
    it('auto _id', function(done){
      var schema = new Schema({
          name: String
      });
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      var schema = new Schema({
          name: String
      }, { _id: true });
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      var schema = new Schema({
          name: String
      }, { _id: false });
      assert.equal(undefined, schema.path('_id'));

      // old options
      var schema = new Schema({
          name: String
      }, { noId: false });
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      var schema = new Schema({
          name: String
      }, { noId: true });
      assert.equal(undefined, schema.path('_id'));
      done();
    })

    it('auto id', function(done){
      var schema = new Schema({
          name: String
      });
      assert.ok(schema.virtualpath('id') instanceof mongoose.VirtualType);

      var schema = new Schema({
          name: String
      }, { id: true });
      assert.ok(schema.virtualpath('id') instanceof mongoose.VirtualType);

      var schema = new Schema({
          name: String
      }, { id: false });
      assert.equal(undefined, schema.virtualpath('id'));

      // old options
      var schema = new Schema({
          name: String
      }, { noVirtualId: false });
      assert.ok(schema.virtualpath('id') instanceof mongoose.VirtualType);

      var schema = new Schema({
          name: String
      }, { noVirtualId: true });
      assert.equal(undefined, schema.virtualpath('id'));
      done();
    })
  });

  describe('hooks', function(){
    it('registration', function(done){
      var Tobi = new Schema();

      Tobi.pre('save', function(){});
      assert.equal(1, Tobi.callQueue.length);

      Tobi.post('save', function(){});
      assert.equal(2, Tobi.callQueue.length);

      Tobi.pre('save', function(){});
      assert.equal(3, Tobi.callQueue.length);
      done();
    });
  });

  describe('indexes', function(){
    describe('definition', function(){
      it('basic', function(done){
        var Tobi = new Schema({
            name: { type: String, index: true }
        });

        assert.equal(true, Tobi.path('name')._index);
        Tobi.path('name').index({ unique: true });
        assert.deepEqual(Tobi.path('name')._index, { unique: true });
        Tobi.path('name').unique(false);
        assert.deepEqual(Tobi.path('name')._index, { unique: false });

        var T, i;

        T = new Schema({
            name: { type: String, sparse: true }
        });
        assert.deepEqual(T.path('name')._index, { sparse: true });

        T = new Schema({
            name: { type: String, unique: true }
        });
        assert.deepEqual(T.path('name')._index, { unique: true });

        T = new Schema({
            name: { type: Date, expires:  '1.5m' }
        });
        assert.deepEqual(T.path('name')._index, { expireAfterSeconds: 90 });

        T = new Schema({
            name: { type: Date, expires:  200 }
        });
        assert.deepEqual(T.path('name')._index, { expireAfterSeconds: 200 });

        T = new Schema({
            name: { type: String, sparse: true, unique: true }
        });
        assert.deepEqual(T.path('name')._index, { sparse: true, unique: true });

        T = new Schema({
            name: { type: String, unique: true, sparse: true }
        });
        i = T.path('name')._index;
        assert.equal(true, i.unique);
        assert.equal(true, i.sparse);

        T = new Schema({
            name: { type: String, index: { sparse: true, unique: true, expireAfterSeconds: 65 }}
        });
        i = T.path('name')._index;
        assert.equal(true, i.unique);
        assert.equal(true, i.sparse);
        assert.equal(65, i.expireAfterSeconds);

        T = new Schema({
            name: { type: Date, index: { sparse: true, unique: true, expires: '24h' }}
        });
        i = T.path('name')._index;
        assert.equal(true, i.unique);
        assert.equal(true, i.sparse);
        assert.equal(60*60*24, i.expireAfterSeconds);

        done();
      })
      it('compound', function(done){
        var Tobi = new Schema({
            name: { type: String, index: true }
          , last: { type: Number, sparse: true }
          , nope: { type: String, index: { background: false }}
        });

        Tobi.index({ firstname: 1, last: 1 }, { unique: true, expires: '1h' });
        Tobi.index({ firstname: 1, nope: 1 }, { unique: true, background: false });

        assert.deepEqual(Tobi.indexes(), [
            [{ name: 1 }, { background: true }]
          , [{ last: 1 }, { sparse: true, background :true }]
          , [{ nope: 1 }, { background : false}]
          , [{ firstname: 1, last: 1}, {unique: true, expireAfterSeconds: 60*60, background: true }]
          , [{ firstname: 1, nope: 1 }, { unique: true, background: false }]
        ]);

        done();
      });
    });
  });

  describe('plugins', function(){
    it('work', function(done){
      var Tobi = new Schema
        , called = false;

      Tobi.plugin(function(schema){
        assert.equal(schema, Tobi);
        called = true;
      });

      assert.equal(true, called);
      done();
    })
  });

  describe('options', function(){
    it('defaults are set', function(done){
      var Tobi = new Schema();

      assert.equal('object', typeof Tobi.options);
      assert.equal(undefined, Tobi.options.safe);
      assert.equal(true, Tobi.options.strict);
      assert.equal(false, Tobi.options.capped);
      assert.equal('__v', Tobi.options.versionKey);
      assert.equal('__t', Tobi.options.discriminatorKey);
      assert.equal(null, Tobi.options.shardKey);
      assert.equal(null, Tobi.options.read);
      assert.equal(true, Tobi.options._id);
      done();
    });

    it('setting', function(done){
      var Tobi = new Schema({}, { collection: 'users' });

      Tobi.set('a', 'b');
      Tobi.set('safe', false);
      assert.equal('users', Tobi.options.collection);

      assert.equal('b', Tobi.options.a);
      assert.deepEqual(Tobi.options.safe, { w: 0 });
      assert.equal(null, Tobi.options.read);

      var tags = [{ x: 1 }];

      Tobi.set('read', 'n');
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('nearest', Tobi.options.read.mode);

      Tobi.set('read', 'n', tags);
      assert.equal('nearest', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi.set('read', ['n', tags]);
      assert.equal('nearest', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'p' });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('primary', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['p', tags] });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('primary', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'primary' });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('primary', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['primary', tags] });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('primary', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 's' });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('secondary', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['s', tags] });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('secondary', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'secondary' });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('secondary', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['secondary', tags] });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal('secondary', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'pp' });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('primaryPreferred', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['pp', tags] });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('primaryPreferred', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'primaryPreferred'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('primaryPreferred', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['primaryPreferred', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('primaryPreferred', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'sp' });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('secondaryPreferred', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['sp', tags] });
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('secondaryPreferred', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'secondaryPreferred'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('secondaryPreferred', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['secondaryPreferred', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('secondaryPreferred', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'n'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('nearest', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['n', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('nearest', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      Tobi = Schema({}, { read: 'nearest'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('nearest', Tobi.options.read.mode);

      Tobi = Schema({}, { read: ['nearest', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal('nearest', Tobi.options.read.mode);
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(1, Tobi.options.read.tags.length);
      assert.equal(1, Tobi.options.read.tags[0].x);

      done();
    });
  });

  describe('virtuals', function(){
    it('works', function(done){
      var Contact = new Schema({
          firstName: String
        , lastName: String
      });

      Contact
      .virtual('fullName')
      .get(function () {
        return this.get('firstName') + ' ' + this.get('lastName');
      })
      .set(function (fullName) {
        var split = fullName.split(' ');
        this.set('firstName', split[0]);
        this.set('lastName', split[1]);
      });

      assert.ok(Contact.virtualpath('fullName') instanceof VirtualType);
      done();
    });

    describe('id', function(){
      it('default creation of id can be overridden (gh-298)', function(done){
        assert.doesNotThrow(function () {
          new Schema({ id: String });
        });
        done();
      });
      it('disabling', function(done){
        var schema = new Schema({ name: String }, { noVirtualId: true });
        assert.strictEqual(undefined, schema.virtuals.id);
        done();
      });
    });

    describe('getter', function(){
      it('scope', function(done){
        var Tobi = new Schema;

        Tobi.virtual('name').get(function (v, self) {
          assert.equal('b', this.a);
          assert.equal('name', self.path);
          return v.toLowerCase();
        })

        assert.equal('yep', Tobi.virtualpath('name').applyGetters('YEP', { a: 'b' }));
        done();
      })
    })

    describe('setter', function(){
      it('scope', function(done){
        var Tobi = new Schema;

        Tobi.virtual('name').set(function (v, self) {
          assert.equal('b', this.a);
          assert.equal('name', self.path);
          return v.toLowerCase();
        })

        assert.equal('yep', Tobi.virtualpath('name').applySetters('YEP', { a: 'b' }));
        done();
      })
    })
  });

  describe('other contexts', function(){
    it('work', function(done){
      var str = 'code = {' +
        '  name: String' +
        ', arr1: Array ' +
        ', arr2: { type: [] }' +
        ', date: Date  ' +
        ', num: { type: Number }' +
        ', bool: Boolean' +
        ', nest: { sub: { type: {}, required: true }}' +
        '}';

      var script = vm.createScript(str, 'testSchema.vm');
      var sandbox = { code: null };
      script.runInNewContext(sandbox);

      var Ferret = new Schema(sandbox.code);
      assert.ok(Ferret.path('nest.sub') instanceof SchemaTypes.Mixed);
      assert.ok(Ferret.path('name') instanceof SchemaTypes.String);
      assert.ok(Ferret.path('arr1') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('arr2') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('date') instanceof SchemaTypes.Date);
      assert.ok(Ferret.path('num') instanceof SchemaTypes.Number);
      assert.ok(Ferret.path('bool') instanceof SchemaTypes.Boolean);
      done();
    });
  });

  describe('#add()', function(){
    it('does not polute existing paths', function(done){
      var o = { name: String }
      var s = new Schema(o);

      assert.throws(function () {
        s.add({ age: Number }, 'name.');
      }, /Cannot set nested path/)

      assert.throws(function () {
        s.add({ age: { x: Number }}, 'name.');
      }, /Cannot set nested path/)
      assert.equal(false, ('age' in o.name));

      var o = { name: 'string' }
      var s = new Schema(o);

      assert.throws(function () {
        s.add({ age: Number }, 'name.');
      }, /Cannot set nested path/)

      assert.throws(function () {
        s.add({ age: { x: Number }}, 'name.');
      }, /Cannot set nested path/)

      assert.equal('string', o.name);
      done();
    });

    it('merging nested objects (gh-662)', function(done){
      var db = start();

      var MergedSchema = new Schema({
        a: {
          foo: String
        }
      });

      MergedSchema.add({
        a: {
          b: {
            bar: String
          }
        }
      });

      mongoose.model('Merged', MergedSchema);

      var Merged = db.model('Merged', 'merged_' + Math.random());

      var merged = new Merged({
        a: {
            foo: 'baz'
          , b: {
              bar: 'qux'
            }
        }
      });

      merged.save(function(err) {
        assert.ifError(err);
        Merged.findById(merged.id, function(err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.a.foo,'baz');
          assert.equal(found.a.b.bar,'qux');
          done();
        });
      });
    })
  });

  it('debugging msgs', function(done){
    var err;
    try {
      new Schema({ name: { first: null } })
    } catch (e) {
      err = e;
    }
    assert.equal(err.message,'Invalid value for schema path `name.first`')
    try {
      new Schema({ age: undefined })
    } catch (e) {
      err = e;
    }
    assert.equal(err.message, 'Invalid value for schema path `age`')
    done();
  });

  describe('construction', function(){
    it('array of object literal missing a type is interpreted as DocumentArray', function(done){
      var goose = new mongoose.Mongoose;
      var s = new Schema({
          arr: [
            { something: { type: String } }
          ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      var M = goose.model('objectliteralschema', s);
      var m = new M({ arr: [ { something: 'wicked this way comes' }] });
      assert.equal('wicked this way comes', m.arr[0].something);
      assert.ok(m.arr[0]._id);
      done();
    });

    it('array of object literal with type.type is interpreted as DocumentArray', function(done){
      var goose = new mongoose.Mongoose;
      var s = new Schema({
          arr: [
            { type: { type: String } }
          ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      var M = goose.model('objectliteralschema2', s);
      var m = new M({ arr: [ { type: 'works' }] });
      assert.equal('works', m.arr[0].type);
      assert.ok(m.arr[0]._id);
      done();
    });

    it('of nested schemas should throw (gh-700)', function(done){
      var a = new Schema({ title: String })
        , err

      try {
        new Schema({ blah: Boolean, a: a });
      } catch (err_) {
        err = err_;
      }

      assert.ok(err);
      assert.ok(/Did you try nesting Schemas/.test(err.message));
      done();
    });

    it('does not alter original argument (gh-1364)', function(done){
      var schema = {
          ids: [{ type: Schema.ObjectId, ref: 'something' }]
        , a: { type: Array }
        , b: Array
        , c: [Date]
        , d: { type: 'Boolean' }
        , e: [{ a: String, b: [{ type: { type: Buffer }, x: Number }] }]
      };

      new Schema(schema);
      assert.equal(6, Object.keys(schema).length);
      assert.deepEqual([{ type: Schema.ObjectId, ref: 'something' }], schema.ids);
      assert.deepEqual({ type: Array }, schema.a);
      assert.deepEqual(Array, schema.b);
      assert.deepEqual([Date], schema.c);
      assert.deepEqual({ type: 'Boolean' }, schema.d);
      assert.deepEqual([{ a: String, b: [{ type: { type: Buffer }, x: Number }] }], schema.e);

      done();
    })

    it('properly gets value of plain objects when dealing with refs (gh-1606)', function (done) {
      var db = start();
      var el = new Schema({ title : String });
      var so = new Schema({
        title : String,
        obj : { type : Schema.Types.ObjectId, ref : 'Element' }
      });

      var Element = db.model('Element', el);
      var Some = db.model('Some', so);

      var ele = new Element({ title : 'thing' });

      ele.save(function (err) {
        assert.ifError(err);
        var s = new Some({ obj : ele.toObject() });
        s.save(function (err) {
          assert.ifError(err);
          Some.findOne({ _id : s.id }, function (err, ss) {
            assert.ifError(err);
            assert.equal(ss.obj, ele.id);
            done();
          });
        });
      });
    });
  });

  describe('property names', function(){
    it('that conflict throw', function(done){
      var child = new Schema({ name: String });

      assert.throws(function(){
        new Schema({
            on: String
          , child: [child]
        });
      }, /`on` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
            options: String
        });
      }, /`options` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
           collection: String
        });
      }, /`collection` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
            schema: String
        });
      }, /`schema` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
            db: String
        });
      }, /`db` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
            modelName: String
        });
      }, /`modelName` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
            isNew: String
        });
      }, /`isNew` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
            errors: String
        });
      }, /`errors` may not be used as a schema pathname/);

      assert.throws(function(){
        new Schema({
            init: String
        });
      }, /`init` may not be used as a schema pathname/);

      done();
    })

    it('that do not conflict do not throw', function(done){
      var child = new Schema({ name: String });

      assert.doesNotThrow(function(){
        new Schema({
            model: String
        });
      });

      assert.doesNotThrow(function(){
        Schema({ child: [{parent: String}] });
      });

      assert.doesNotThrow(function(){
        Schema({ child: [{parentArray: String}] });
      });

      assert.doesNotThrow(function(){
        var s = Schema({ docs: [{ path: String }] });
        var M = mongoose.model('gh-1245', s);
        var m = new M({ docs: [{ path: 'works' }] });
      });

      assert.doesNotThrow(function () {
        var s = Schema({ setMaxListeners: String });
        var M = mongoose.model('setMaxListeners-as-property-name', s);
        var m = new M({ setMaxListeners: 'works' });
      })

      done();
    })

    it('permit _scope to be used (gh-1184)', function(done){
      var db = start();
      var child = new Schema({ _scope: Schema.ObjectId });
      var C = db.model('scope', child);
      var c= new C;
      c.save(function (err) {
        db.close();
        assert.ifError(err);
        try {
          c._scope;
        } catch (e) {
          err = e;
        }
        assert.ifError(err);
        done();
      })
    })
  })

  describe('pathType()', function(){
    var schema;

    before(function(){
      schema = Schema({
          n: String
        , nest: { thing: { nests: Boolean }}
        , docs:[{ x: [{ y:String }] }]
        , mixed: {}
      })
    })

    describe('when called on an explicit real path', function(){
      it('returns "real"', function(done){
        assert.equal('real', schema.pathType('n'));
        assert.equal('real', schema.pathType('nest.thing.nests'));
        assert.equal('real', schema.pathType('docs'));
        assert.equal('real', schema.pathType('docs.0.x'));
        assert.equal('real', schema.pathType('docs.0.x.3.y'));
        assert.equal('real', schema.pathType('mixed'));
        done();
      })
    })
    describe('when called on a virtual', function(){
      it('returns virtual', function(done){
        assert.equal('virtual', schema.pathType('id'));
        done();
      })
    })
    describe('when called on nested structure', function(){
      it('returns nested', function(done){
        assert.equal('nested', schema.pathType('nest'));
        assert.equal('nested', schema.pathType('nest.thing'));
        done();
      })
    })
    describe('when called on undefined path', function(){
      it('returns adHocOrUndefined', function(done){
        assert.equal('adhocOrUndefined', schema.pathType('mixed.what'));
        assert.equal('adhocOrUndefined', schema.pathType('mixed.4'));
        assert.equal('adhocOrUndefined', schema.pathType('mixed.4.thing'));
        assert.equal('adhocOrUndefined', schema.pathType('mixed.4a.thing'));
        assert.equal('adhocOrUndefined', schema.pathType('mixed.4.9.thing'));
        assert.equal('adhocOrUndefined', schema.pathType('n.3'));
        assert.equal('adhocOrUndefined', schema.pathType('n.3a'));
        assert.equal('adhocOrUndefined', schema.pathType('n.3.four'));
        assert.equal('adhocOrUndefined', schema.pathType('n.3.4'));
        assert.equal('adhocOrUndefined', schema.pathType('n.3.4a'));
        assert.equal('adhocOrUndefined', schema.pathType('nest.x'));
        assert.equal('adhocOrUndefined', schema.pathType('nest.thing.x'));
        assert.equal('adhocOrUndefined', schema.pathType('nest.thing.nests.9'));
        assert.equal('adhocOrUndefined', schema.pathType('nest.thing.nests.9a'));
        assert.equal('adhocOrUndefined', schema.pathType('nest.thing.nests.a'));
        done();
      })
    })
  })
});
