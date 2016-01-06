(function() {
    'use strict';

    var _ = require('lodash');

    module.exports = {
        /**
         * Adapter to transform the data from a Google calendar API call into the DSL used
         * by this library
         *
         * @param {object} data Raw data from the Google calendar API (assumed version 3,
         * other versions may work)
         * @returns {object} Data in the DSL that we can derive statistics from
         */
        transform: function(data) {
            return _(data).map(function(datum) {
                return {
                    summary: datum.summary,
                    start: new Date(Date.parse(datum.start.dateTime)),
                    end: new Date(datum.end.dateTime)
                };
            }).value();
        }
    };
})();