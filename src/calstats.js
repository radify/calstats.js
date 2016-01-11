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

  var adapters = {
    google: require('./adapters/google'),
    ical: require('./adapters/ical')
  };

  module.exports = {

    adapters: adapters,

    input: {
      rawData: null,
      startDate: null,
      endDate: null
    },

    data: null,
    breakdown: null,

    adapter: adapters.ical,

    /**
     * Set the raw data to be analysed
     * @param {object} data Raw data to be analysed
     * @return {object} this
     */
    setRawData: function(data) {
      this.input.rawData = data;
      return this;
    },

    /**
     * @param {string} startDate Start of the date range you're interested in e.g. 2015-01-01
     * @return {object} this
     */
    setStartDate: function(startDate) {
      this.input.startDate = startDate;
      return this;
    },

    /**
     * @param {string} endDate End of the date range you're interested in e.g. 2015-01-08
     * @return {object} this
     */
    setEndDate: function(endDate) {
      this.input.endDate = endDate;
      return this;
    },

    /**
     * @param {object} adapter Either a built in one like calstats.adapters.ical or your own adapter matching that
     * interface. Defaults to ical
     * @return {object} this
     */
    setAdapter: function(adapter) {
      this.adapter = adapter;
      return this;
    },

    /**
     * Take a set of calendar data, and parse some statistics from it, using the `ical` adapter
     *
     * Legacy method - the "new way" is to use the fluent interface:
     *
     *     calstats.setStartDate('2016-01-01')
     *             .setEndDate('2016-02-01')
     *             .setRawData(someData)
     *             .setAdapter(calstats.adapters.ical)
     *             .run();
     *
     * Calls `this.run();` once everything is set up
     *
     * @param {object} data ical data from the ical library
     * @param {datetime} startDate string e.g. 2015-01-01
     * @param {datetime} string e.g. 2015-10-01
     */
    load: function(data, startDate, endDate) {
      this.setRawData(data);
      this.setStartDate(startDate);
      this.setEndDate(endDate);
      this.setAdapter(this.adapters.ical); // default adapter is ical for historical reasons

      this.run();
    },

    validate: function() {
      if(!this.input.startDate) {
        throw 'Please set the start date - e.g. calstats.setStartDate("2016-01-01")';
      }

      if(!this.input.endDate) {
        throw 'Please set the end date - e.g. calstats.setStartDate("2016-01-06")';
      }

      if(!this.input.rawData) {
        throw 'Please set the raw data - e.g. calstats.setRawData(data)';
      }
    },

    /**
     * Load the data from this.rawData and transform it using the selected adapter
     *
     * @example
     *
     *     calstats.setStartDate('2016-01-01')
     *             .setEndDate('2016-02-01')
     *             .setRawData(someData)
     *             .setAdapter(calstats.adapters.ical)
     *             .run();
     *
     *     console.log(calstats.getTree()); // Tree view of the transformed data
     */
    run: function() {

      this.validate();

      var data = this.adapter.transform(this.input.rawData);

      var filterStartDate = new Date(this.input.startDate);
      var filterEndDate = new Date(this.input.endDate);
      filterEndDate.setDate(filterEndDate.getDate() + 1);
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
     * 'radify-labs-calstats': 1,
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
     *         calstats: [Object],
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
