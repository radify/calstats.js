[ ![Travis build status](https://travis-ci.org/radify/icalstats.js.svg)](https://travis-ci.org/radify/icalstats)
[ ![npm version](https://badge.fury.io/js/icalstats.svg)](https://www.npmjs.com/package/icalstats)
[ ![Dependency Status](https://david-dm.org/radify/icalstats.js.svg)](https://david-dm.org/radify/icalstats.js)
[ ![devDependency Status](https://david-dm.org/radify/icalstats.js/dev-status.svg)](https://david-dm.org/radify/icalstats.js#info=devDependencies)

# icalstats.js

NodeJS tool that can generate statistics from a calendar by parsing [tags]. Provides:

* Amount of time spent on each client
* Detailed breakdown of tasks within projects
* Total time spent
* Count of events
* "Tree" of the calendar data

This library has adapters for:

* [/src/adapters/googleapi.js](Google Calendar via oauth)
* [/src/adapters/icalfeed.js](ical formatted feed), as delivered by the [ical library](https://www.npmjs.com/package/ical)

> Feel free to write your own adapter! See our [contributing guidelines](/CONTRIBUTING.md)

## Boundaries

This tool is for:

* Generating statistics from a calendar

This tools is NOT for:

* Getting the data from your calendar API - you must do this yourself (some examples are below)
* Entering data into a calendar

# Installation

```bash
npm install icalstats
```

# How icalstats.js works

`icalstats.js` parses [tags] out of your ical feed and uses that to create statistics.

In your calendar, make sure your entries have "[tags] in their subjects". Tags are simply square brackets. You create events in your calendar and write something like `[projecta-development]` or `[projecta-research]`. For example:

* "[research] investigating AngularJS plugins"
* "[project-a] writing new user interface"

Here is an example of using tags in Google Calendar:

![Google Calendar usage example](/img/usage-example.png)

The first "part" of a tag is used as the top level tag. So, if you have `[projecta-one]` and `[projecta-two]`, this means that the tool can group project a's entries together (exposed using `getHighLevelBreakdown()`) and then allow you to drill down into its details (using `getBreakdown()`).

# API

Instantiate with:

```javascript
var icalstats = require('icalstats');
```

You then need to run the `load` method, which loads the data into it. You need the [ical library](https://www.npmjs.com/package/ical) for this:

```javascript
var icalstats = require('icalstats');
var ical = require('ical');
// load the ical adapter
var adapter = require('/src/adapters/icalfeed.js');

// use the ical library to grab some raw ical data
ical.fromURL(someUrl, {}, function(err, data) {

    // load the raw ical data into icalstats
    icalstats.load(data, adapter, startDate, endDate);

    // icalstats is now ready to rock!
});
```

Once it's ready to rock, you can call the following functions:

* `getEarliest()` - returns the earliest event date that was found in the ical feed within your specified date range
* `getLatest()` - returns the latest event date that was found in the ical feed within your specified date range
* `getCount()` - returns the count of events within your specified date range
* `getTotalHours()` - returns the total number of hours of the events within your specified date range
* `getHighLevelBreakdown()` - returns a breakdown by the top level, for example:

```javascript
{ research: 6, admin: 3.5, project: 16.5 }
```

* `getBreakdown` - returns a full breakdown, for example:
```
{ research: 6,
  admin: 3.5,
  'project-c': 4,
  'project-b': 4.5,
  'project-a': 8 }
```

* `getTree` - return a tree-type breakdown. Hour counts are available with the `.value` key at any point in the tree. This means that, given input breakdown data like:

```javascript
{
    'radify': 1,
    'radify-labs': 1,
    'radify-labs-admin': 1,
    'radify-labs-icalstats': 1,
    'radify-labs-radiian': 1,
    'radify-labs-radiian-debugging': 1,
    'radify-labs-radiian-publishing': 1,
    'radify-admin': 1,
    'radify-admin-meeting': 1
}
```

icalstats.js can tell you things like:

* 9 hours were spent on all Radify tasks
* 3 hours were spent on all Radify labs radiian tasks
* 1 hour was spent on debugging Radify labs radiian
* 2 hours was spent in total on Radify admin
* 1 hour was spent in Radify admin meeting, and 1 hour in "radify-admin" (expressed as "other")

This means that your client applications can support 'drilling down' into icalstats.js data sets.

# Example usages

## Example API

Here is a simple API that consumes the `icalstats.js` library. It uses:

* [Hapi framework](http://hapijs.com/) - used for building an API
* [ical library](https://www.npmjs.com/package/ical) - for loading and parsing ical feeds
* icalstats.js - this library, used for producing statistics

```javascript
var Hapi = require('hapi');
var icalstats = require('icalstats');
var ical = require('ical');
// load the ical adapter
var adapter = require('/src/adapters/icalfeed.js');

var server = new Hapi.Server();
server.connection({port: 4730, routes: {cors: true}});
server.start(function() {
  console.log('Server running at:', server.info.uri);
});

server.route({
  method: ['POST'],
  path: '/',
  handler: function(request, reply) {
    ical.fromURL(request.payload.cal, {}, function(err, data) {
      icalstats.load(data, adapter, request.payload.startDate, request.payload.endDate);

      reply({
        earliest: icalstats.getEarliest(),
        latest: icalstats.getLatest(),
        count: icalstats.getCount(),
        total: icalstats.getTotalHours(),
        breakdown: icalstats.getBreakdown(),
        highLevelBreakdown: icalstats.getHighLevelBreakdown(),
        tree: icalstats.getTree()
      });
    });
  }
});
```

# Adapters

icalstats.js comes bundled with adapters to parse:

This library has adapters for:

* [/src/adapters/googleapi.js](Google Calendar via oauth) - results from the [Google Calendar API events/list call](https://developers.google.com/google-apps/calendar/v3/reference/events/list)
* [/src/adapters/icalfeed.js](ical formatted feed), as delivered by the [ical library](https://www.npmjs.com/package/ical) - an icalstats feed as loaded through the [ical library](https://www.npmjs.com/package/ical)

> Feel free to write your own adapter! See our [contributing guidelines](/CONTRIBUTING.md)

To load an adapter, simply require it and tell icalstats.js to use that adapter:

```javascript
// load the Google calendar adapter
var adapter = require('./src/adapters/googleapi');

// ...

// load the data into icalstats using the calendar adapter to normalise the data
icalstats.load(data, adapter, '2016-01-01', '2016-12-30');
```

```javascript
// load the icalstats adapter
var adapter = require('./src/adapters/icalfeed');

// ...

// load the data into icalstats using the calendar adapter to normalise the data
icalstats.load(data, adapter, '2016-01-01', '2016-12-30');

...

// load the data into icalstats using the calendar adapter to normalise the data
icalstats.load(data, adapter, '2016-01-01', '2016-12-30');
```

## Example command line client

* [Commander](https://www.npmjs.com/package/commander) - used for a nice CLI interface
* [ical library](https://www.npmjs.com/package/ical) - for loading and parsing ical feeds
* icalstats.js - this library, used for producing statistics

```javascript
var program = require('commander');
var icalstats = require('icalstats');
var ical = require('ical');
var adapter = require('./src/adapters/icalfeed');

program
  .version('0.0.3')
  .option('-i, --ical [url]', 'Private ical link from Google Calendar')
  .option('-s, --startDate [startDate]', 'The date to start from, e.g. 2015-05-01')
  .option('-e, --endDate [endDate]', 'The date to start from, e.g. 2015-05-08')
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);

ical.fromURL(program.ical, {}, function(err, data) {
  icalstats.load(data, adapter, program.startDate, program.endDate);

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
```

# Development

Clone this repo and then install dependencies with:

```bash
npm install
```

Now build the project by running:

```bash
gulp
```

This will create `/icalstats.js`, which is the file that other projects should use, as specified in `package.json`.

Note the directory `spec` which contains the unit tests for this library.

If you would like to submit code, feel free to create a pull request.
