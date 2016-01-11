var calstats = require('./build/calstats');
var ical = require('ical');

ical.fromURL('https://www.google.com/calendar/ical/union-of-rad.com_mr68b4guivfquvlbspdmcc3ljo%40group.calendar.google.com/private-932d89d5c306ba872b4283cb2ea03e57/basic.ics', {}, function(err, data) {

    calstats
      .setStartDate('2015-12-01')
      .setEndDate('2016-02-01')
      .setRawData(data)
      .run();

    console.log("Date range: " + calstats.getEarliest() + " - " + calstats.getLatest());
    console.log("count: " + calstats.getCount() + " events");
    console.log("total: " + calstats.getTotalHours() + " hours");

    console.log("\nHigh level breakdown:");
    console.log(calstats.getHighLevelBreakdown());

    console.log("\nDetailed breakdown:");
    console.log(calstats.getBreakdown());

    console.log("\nTree:");
    console.log(calstats.getTree());
});
