(function() {
    'use strict';

    module.exports = {
      /**
       * Adapter to transform the data from an ical feed into the DSL used
       * by this library
       *
       * @param {object} data Raw data from an ical feed as provided by the ical NPM library
       * @returns {object} Data in the DSL that we can derive statistics from
       */
      transform: function(data) {
        return data;
      }
    };
})();