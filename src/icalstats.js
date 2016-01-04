(function() {
  'use strict';
  var _ = require('lodash');

  function extractTags(event) {
    var summary = event.summary.replace(/ /g, '_');
    if (!summary || summary === '') {
      return ['untagged-' + summary];
    }

    // get everything that looks like a tag
    var tags = summary.match(/\[([a-zA-Z0-9\_\.\s\-]*?)\]/g);

    if (_.isEmpty(tags)) {
      tags = ['untagged-' + summary];
    }

    return _(tags).map(function(tag) {
      return tag.toLowerCase().replace('[', '').replace(']', '').replace(/ /g, '_');
    }).value();
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
     * Take a set of calendar data, and parse some statistics from it
     *
     * @param {object} data ical data from the ical library
     * @param {object} adapter
     * @param {datetime} startDate string e.g. 2015-01-01
     * @param {datetime} string e.g. 2015-10-01
     */
    load: function(data, adapter, startDate, endDate) {
      data = adapter.transform(data);

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

    /**
     * Get just the high level breakdown of your data
     *
     * so if you have a breakdown of:
     * {
     *   'radify': 1,
     *   'radify-labs': 2
     *   'radify-labs-x': 4
     * }
     *
     * the breakdown will return
     * { radify: 7 }
     */
    getHighLevelBreakdown: function() {
      return _.transform(this.getTree(), function(result, n, key) {
        result[key] = n.value;
      });
    },

    /**
     * Convert the breakdown into a tree
     *
     * So, if your breakdown looks like:
     *
     * 'radify': 1,
     * 'radify-labs': 1,
     * 'radify-labs-admin': 1,
     * 'radify-labs-icalstats': 1,
     * 'radify-labs-radiian': 1,
     * 'radify-labs-radiian-debugging': 1,
     * 'radify-labs-radiian-publishing': 1,
     * 'radify-admin': 1,
     * 'radify-admin-meeting': 1
     *
     * This will return:
     *
     * { radify:
     *     { value: 9,
     *       other: { value: 1 },
     *       labs:
     *       { value: 6,
     *         admin: [Object],
     *         icalstats: [Object],
     *         radiian: [Object] },
     *       admin: { value: 2, meeting: [Object] } } }
     *
     * Each key has "value", which allows you to extract the count
     *
     * For example, from this data:
     *
     * expect(tree.radify.labs.radiian.value).toEqual(3);
     * expect(tree.radify.labs.radiian.debugging.value).toEqual(1);
     *
     * Supports up to 4 levels of depth
     *
     * @returns {object} Tree-based representation of this.breakdown
     */
    getTree: function() {

      function addOrSet(thing, key, val) {
        if(thing[key]) {
          thing[key].value += val;
        } else {
          thing[key] = { value: val };
        }
      }

      var tree = {};
      var self = this;

      _(this.breakdown).keys().forEach(function(key) {
        var keys = key.split('-');
        var val = self.breakdown[key];

        if (keys.length > 0) {
          addOrSet(tree, keys[0], val);
        }

        if (keys.length > 1) {
          addOrSet(tree[keys[0]], keys[1], val);
        }

        if (keys.length > 2) {
          addOrSet(tree[keys[0]][keys[1]], keys[2], val);
        }

        if (keys.length > 3) {
          addOrSet(tree[keys[0]][keys[1]][keys[2]], keys[3], val);
        }
      }).value();

      // autofill 'other' for when, for example, time is both tracked to foo-bar and foo directly.
      // this means when it gets displayed you'd get:
      // foo:     10 hours
      //   bar:   6  hours
      //   other: 4  hours
      //
      // so, 'other' is kind of a virtual count
      function autofill(tree) {
        _(tree)
          .keys()
          .without('value', 'other')
          .forEach(function(key) {

            var sumOfChildren = _(tree[key])
              .keys()
              .without('value', 'other')
              .map(function(k) {
                return tree[key][k].value;
              })
              .sum();

            var otherHours = tree[key].value - sumOfChildren;
            if (otherHours > 0 && otherHours < tree[key].value) {
              tree[key].other = { value: otherHours };
            }

            autofill(tree[key]);
        }).value();
      }

      autofill(tree);

      return tree;
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
      var earliest = _(this.data).sortBy('start').first();
      return earliest ? earliest.start : null;
    },

    /**
     * @returns {Date} Latest event
     */
    getLatest: function() {
      var latest = _(this.data).sortBy('start').reverse().first();
      return latest ? latest.start : null;
    },

    /**
     * @returns {Number} Number of events
     */
    getCount: function() {
      return this.data && this.data.length ? this.data.length : 0;
    },

    /**
     * @returns {Number} Count of hours in the date range
     */
    getTotalHours: function() {
      var total = _(this.breakdown).reduce(function(result, n, key) {
        return result + n;
      });

      return _.isUndefined(total) ? 0 : total;
    }
  };

})();
