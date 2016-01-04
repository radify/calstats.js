(function() {
    'use strict';

    var _ = require('lodash');

    module.exports = {
        transform: function(data) {
            return _(data).map(function(datum) {
                return {
                    summary: datum.summary,
                    start: new Date(Date.parse(datum.start.dateTime)),
                    end: new Date(datum.end.dateTime)
                };
            }).value();

            return data;
        }
    };
})();