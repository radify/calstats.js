var iCalStats = require('../src/icalstats.js');
var ical = require('ical');

function dateFromUTC() {
  var utcDate = Date.UTC.apply(null, arguments);
  return new Date(utcDate);
}

describe('iCalStats Library Test Suite:', function() {

  var fixture;

  // applied before each nested describe()
  beforeEach(function() {
    fixture = ical.parseFile('./fixtures/basic.ics');
  });

  describe('smart tags', function() {
    beforeEach(function() {
      iCalStats.breakdown = {
        research: 6,
        admin: 3.5,
        'icalstats-dev': 4,
        'icalstats-research': 4.5,
        'mycorp-marketing': 8,
        'mycorp-opensource': 3
      };
    });

    it('Adds up all sub entries and summarises them', function() {
      var hlb = iCalStats.getHighLevelBreakdown();
      expect(hlb.research).toEqual(6);
      expect(hlb.icalstats).toEqual(8.5);
      expect(hlb.mycorp).toEqual(11);
    });
  });

  describe('standard data set', function() {
    beforeEach(function() {
      iCalStats.load(fixture, '2015-05-01', '2015-06-05');
    });

    describe('Valid date range:', function() {
      describe('getCount()', function() {
        it('counts the total number of events in the date range', function() {
          expect(iCalStats.getCount()).toEqual(6);
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
        expect(iCalStats.getBreakdown()).toEqual(correctObject);
      });
    });

    describe('getEarliest()', function() {
      it('should return correct Date Object of earliest event.', function() {
        expect(iCalStats.getEarliest()).toEqual(dateFromUTC(2015, 4, 4, 8));
      });
    });

    describe('getLatest()', function() {
      it('should return the correct Date Object of the earliest event.', function() {
        expect(iCalStats.getLatest()).toEqual(dateFromUTC(2015, 4, 6, 11, 30));
      });
    });

    describe('getTotalHours()', function() {
      it('should return correct total hours', function() {
        expect(iCalStats.getTotalHours()).toEqual(26);
      });
    });
  });

  describe('invalid date range', function() {
    describe('load()', function() {
      it('should throw an exception', function() {
        expect(function() {
          iCalStats.load(fixture, '2015-10-01', '2015-01-02');
        }).toThrow('Start date must be before end date');
      });
    });
  });

  describe('date range in which there are no events', function() {
    beforeEach(function() {
      iCalStats.load(fixture, '2015-01-01', '2015-01-02');
    });

    describe('getCount()', function() {
      it('returns zero as there are no events in the specified date range', function() {
        expect(iCalStats.getCount()).toEqual(0);
      });
    });

    describe('getEarliest()', function() {
      it('returns null', function() {
        expect(iCalStats.getEarliest()).toEqual(null);
      });
    });

    describe('getLatest()', function() {
      it('returns null', function() {
        expect(iCalStats.getLatest()).toEqual(null);
      });
    });

    describe('getTotalHours()', function(){
      it('returns 0', function() {
        expect(iCalStats.getTotalHours()).toEqual(0);
      });

    });
  });
});
