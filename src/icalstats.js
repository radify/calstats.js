(function() {
  'use strict';
  var _ = require('lodash');

  function extractTags(event) {
    if (!event.summary || event.summary === '') {
      return ['no-tags'];
    }

    var regex = /\[([a-zA-Z\.\s\-]*?)\]/g;
    var tags = event.summary.match(regex);

    if (!tags || tags.length === 0) {
      return ['no-tags'];
    }

    for (var i = 0; i < tags.length; i++) {
      tags[i] = tags[i].toLowerCase().replace('[', '').replace(']', '');
    }

    return tags;
  }

  function getLengthInHours(event) {
    var lengthMs = event.end.getTime() - event.start.getTime();
    var lengthInHours = lengthMs / 1000 / 60 / 60;
    return lengthInHours;
  }

  function isValid(event) {
    return event.end && event.start;
  }

  module.exports = {

    data: null,
    breakdown: null,

    /**
     * Take an ical feed, and parse some statistics from it
     *
     * @param data ical data from the ical library
     * @param startDate string e.g. 2015-01-01
     * @param endDate string e.g. 2015-10-01
     */
    load: function(data, startDate, endDate) {

      // console.log(data);
      var filterStartDate = new Date(startDate);
      var tmp = new Date(endDate);
      var filterEndDate = new Date(endDate);
      filterEndDate.setDate(tmp.getDate() + 1);
      var totals = {};

      if (filterStartDate > filterEndDate) {
        throw 'Start date must be before end date';
      }

      function updateTotals(tags, lengthInHours) {
        for (var i = 0; i < tags.length; i++) {
          if (!totals[tags[i]]) {
            totals[tags[i]] = 0;
          }
          totals[tags[i]] += lengthInHours;
        }
      }


      function inDateRange(ev) {
        if (ev.start < filterStartDate) {
          return false;
        }
        if (ev.end > filterEndDate) {
          return false;
        }
        return true;
      }

      data = _(data).filter(isValid).filter(inDateRange).value();

      for (var k in data) {
        if (data.hasOwnProperty(k)) {
          var event = data[k];

          updateTotals(extractTags(event), getLengthInHours(event));
        }
      }

      this.breakdown = totals;
      this.data = data;
    },

    getHighLevelBreakdown: function() {
      return _.transform(this.breakdown, function(result, n, key) {
        var topLevelKey = key.split('-')[0];
        if (result[topLevelKey]) {
          result[topLevelKey] += n;
        } else {
          result[topLevelKey] = n;
        }
      });
    },

    /**
     * @returns {Object} e.g.
     *
     * { research: 6,
     *   admin: 3.5,
     *   'project-c': 4,
     *   'project-b': 4.5,
     *   'project-a': 8 }
     */
    getBreakdown: function() {
      return this.breakdown;
    },

    /**
     * @returns {Date} Earliest event
     */
    getEarliest: function() {
      return _(this.data).sortBy('start').first().start;
    },

    /**
     * @returns {Date} Latest event
     */
    getLatest: function() {
      return _(this.data).sortBy('start').reverse().first().start;
    },

    /**
     * @returns {Number} Number of events
     */
    getCount: function() {
      // console.log(this.data);
      return this.data.length;
    },

    /**
     * @returns {Number} Count of hours in the date range
     */
    getTotalHours: function() {
      return _(this.breakdown).reduce(function(result, n, key) {
        return result + n;
      });
    }
  };

})();
