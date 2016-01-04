var icalstats = require('./src/icalstats');
var adapter = require('./src/adapters/icalfeed');
var ical = require('ical');

ical.fromURL('https://www.google.com/calendar/ical/union-of-rad.com_mr68b4guivfquvlbspdmcc3ljo%40group.calendar.google.com/private-932d89d5c306ba872b4283cb2ea03e57/basic.ics', {}, function(err, data) {

    // TODO better format, using defaults, e.g.:
    //icalStats.setAdapter(adapter)
    //    .setStartDate(program.startDate)
    //    .setEndDate(program.endDate)
    //    .setData(data);

    icalstats.load(data, adapter, '2016-01-01', '2016-12-30');

    console.log("Date range: " + icalstats.getEarliest() + " - " + icalstats.getLatest());
    console.log("count: " + icalstats.getCount() + " events");
    console.log("total: " + icalstats.getTotalHours() + " hours");

    console.log("\nHigh level breakdown:");
    console.log(icalstats.getHighLevelBreakdown());

    console.log("\nDetailed breakdown:");
    console.log(icalstats.getBreakdown());

    console.log("\nTree:");
    console.log(icalstats.getTree());
});
