var calstats = require('../src/calstats.js');
var ical = require('ical');

function dateFromUTC() {
  var utcDate = Date.UTC.apply(null, arguments);
  return new Date(utcDate);
}

describe('parsing an ical feed', function() {

  describe('handling of untagged elements', function() {

    var fixture;

    // applied before each nested describe()
    beforeEach(function() {
      fixture = ical.parseFile('./fixtures/mostly-untagged.ics');

      calstats.load(fixture, '2015-05-01', '2015-06-05');
    });

    describe('getHighLevelBreakdown()', function() {
      it('groups untagged elements into an untagged collection', function() {
        var hlb = calstats.getHighLevelBreakdown();

        expect(hlb.untagged).toEqual(18);
        expect(hlb.project).toEqual(8);

      });
    });

    describe('getTree()', function() {
      it('groups all untagged elements into a high level collection', function() {
        var tree = calstats.getTree();
        expect(tree.untagged.value).toEqual(18);
        expect(tree.untagged.notags.value).toEqual(6);

        expect(tree.untagged.meeting_and_emails.value).toEqual(3.5);
        expect(tree.untagged.sprint_planning.value).toEqual(4);
      });
    });
  });

  describe('calstats Library Test Suite:', function() {

    var fixture;

    // applied before each nested describe()
    beforeEach(function() {
      fixture = ical.parseFile('./fixtures/basic.ics');
    });

    describe('smart tags', function() {
      beforeEach(function() {
        calstats.breakdown = {
          research: 6,
          admin: 3.5,
          'calstats-dev': 4,
          'calstats-research': 4.5,
          'mycorp-marketing': 8,
          'mycorp-opensource': 3
        };
      });

      it('Adds up all sub entries and summarises them', function() {
        var hlb = calstats.getHighLevelBreakdown();
        expect(hlb.research).toEqual(6);
        expect(hlb.calstats).toEqual(8.5);
        expect(hlb.mycorp).toEqual(11);
      });
    });

    describe('smart tags', function() {

      var tree;

      describe('simple case', function() {


        beforeEach(function() {
          calstats.breakdown = {
            'radify': 1,
            'radify-labs': 1,
            'radify-labs-admin': 1,
            'radify-labs-calstats': 1,
            'radify-labs-radiian': 1,
            'radify-labs-radiian-debugging': 1,
            'radify-labs-radiian-publishing': 1,
            'radify-admin': 1,
            'radify-admin-meeting': 1
          };

          tree = calstats.getTree();
        });

        it('Creates a tree', function() {
          expect(tree.radify.admin.value).toEqual(2);
          expect(tree.radify.admin.meeting.value).toEqual(1);
        });

        it('summarises at each level', function() {
          expect(tree.radify.value).toEqual(9);
          expect(tree.radify.labs.value).toEqual(6);
          expect(tree.radify.labs.radiian.value).toEqual(3);
          expect(tree.radify.labs.radiian.debugging.value).toEqual(1);
        });

        it('supports up to 4 levels', function() {
          expect(tree.radify.labs.radiian.debugging.value).toEqual(1);
        });
      });

      describe('real data', function() {
        beforeEach(function() {
          calstats.breakdown = {
            "radify-labs":13,
            "someclient-messaging":37,
            "someclient-training":33,
            "someclient-support":21,
            "radify-admin":9.5,
            "radify-labs-denzel":2,
            "someotherclient-automation":5.5,
            "someotherclient-development-maildev":10.5,
            "radify-labs-aws-php-sdk":2,
            "radify-marketing":13.5,
            "radify-specification-denzel":1.5,
            "someclient-demo":1,
            "radify-research":1.5,
            "someclient-meeting":10,
            "someotherclient-devops":4,
            "client3":0.5,
            "someclient-mailing-spec":1,
            "someotherclient-support":30.5,
            "someclient-mailing":1,
            "radify-documentation":1.5,
            "someotherclient-meeting":0.5,
            "someclient-specification":8.5,
            "radify-meeting":2.5,
            "opensource-prospector":1.5,
            "opensource-radiian":23,
            "opensource-calstats":31,
            "someotherclient":37,
            "someclient":0.5,
            "marketing-blog":4,
            "opensource-honestybox":0.5,
            "someclient-roadmap":1,
            "someclient-charts":1.5};

          tree = calstats.getTree();
        });

        it('creates other for nodes that have time directly tracked to a the root rather than subtasks', function() {
          expect(tree.someclient.mailing.other.value).toEqual(1);
        });

        it('will not create other for nodes that are fully accounted for', function() {
          expect(tree.other).toBeUndefined();
        });
      });

      describe('smart tags autofilling with "other" for unspecified tasks', function() {

        beforeEach(function() {
          calstats.breakdown = {
            'radify-labs-radiian': 1,
            'radify-labs': 1,
            'radify': 3,

            'client-development-foo-bar': 3,
            'client-development-foo': 2,
            'client-development-baz-bip': 1,
            'client': 42
          };

          tree = calstats.getTree();
        });

        it('Fills the base value', function() {
          expect(tree.radify.value).toEqual(5);
        });

        it('Fills in an other count for unspecified tasks at a given level of the tree', function() {
          expect(tree.radify.other.value).toEqual(3);

          expect(tree.client.development.foo.other.value).toEqual(2);
          expect(tree.client.other.value).toEqual(42);
          expect(tree.client.value).toEqual(48);
        });
      });
    });

    describe('standard data set', function() {
      beforeEach(function() {
        calstats.load(fixture, '2015-05-01', '2015-06-05');
      });

      describe('Valid date range:', function() {
        describe('getCount()', function() {
          it('counts the total number of events in the date range', function() {
            expect(calstats.getCount()).toEqual(6);
          });
        });
      });

      describe('getBreakdown()', function() {
        it('should return the correct JSON object', function() {
          var correctObject = {
            research: 6,
            admin: 3.5,
            'project-c': 4,
            'project-b': 4.5,
            'project-a': 8
          };
          expect(calstats.getBreakdown()).toEqual(correctObject);
        });
      });

      describe('getEarliest()', function() {
        it('should return correct Date Object of earliest event.', function() {
          expect(calstats.getEarliest()).toEqual(dateFromUTC(2015, 4, 4, 8));
        });
      });

      describe('getLatest()', function() {
        it('should return the correct Date Object of the earliest event.', function() {
          expect(calstats.getLatest()).toEqual(dateFromUTC(2015, 4, 6, 11, 30));
        });
      });

      describe('getTotalHours()', function() {
        it('should return correct total hours', function() {
          expect(calstats.getTotalHours()).toEqual(26);
        });
      });
    });

    describe('invalid date range', function() {
      describe('load()', function() {
        it('should throw an exception', function() {
          expect(function() {
            calstats.load(fixture, '2015-10-01', '2015-01-02');
          }).toThrow('Start date must be before end date');
        });
      });
    });

    describe('date range in which there are no events', function() {
      beforeEach(function() {
        calstats.load(fixture, '2015-01-01', '2015-01-02');
      });

      describe('getCount()', function() {
        it('returns zero as there are no events in the specified date range', function() {
          expect(calstats.getCount()).toEqual(0);
        });
      });

      describe('getEarliest()', function() {
        it('returns null', function() {
          expect(calstats.getEarliest()).toEqual(null);
        });
      });

      describe('getLatest()', function() {
        it('returns null', function() {
          expect(calstats.getLatest()).toEqual(null);
        });
      });

      describe('getTotalHours()', function(){
        it('returns 0', function() {
          expect(calstats.getTotalHours()).toEqual(0);
        });

      });
    });
  });

});
