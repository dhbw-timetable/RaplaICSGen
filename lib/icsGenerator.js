const cfg = require('../config');

const co = require('co');
const fs = require('mz/fs');
const moment = require('moment');
const ical = require('ical-generator');

const generateDescription = event => {
  let summary = '';

  summary += 'Lecturer: ' + event.person;
  summary += '\nResources: ' + event.resources.join(', ');

  summary += '\n\n' + cfg.disclaimerText;

  summary += '\n\nLast updated at ' + event.lastUpdate.format('YYYY-MM-DD HH:mm:ss');

  return summary;
};

module.exports = {

  writeOutputFile(events, file) {
    return co(function * () {

      const icalEvents = [];
      events.forEach(event => {
        let location = '';
        
        if (event.resources.length > 1) {

          event.resources.forEach(resource => {
            if (resource.indexOf('STG-') < 0) {
              location = resource;
            }
          });

        }

        icalEvents.push({
          start: event.start.toDate(),
          end: event.end.toDate(),
          timestamp: new Date(),
          summary: event.title,
          description: generateDescription(event),
          location
        });
      });

      const calendar = ical({
        domain: 'raplaicsgen.lschuermann.xyz',
        prodId: '//lschuermann//RaplaICSGen//EN',
        events: icalEvents
      });

      yield fs.writeFile(file, calendar.toString());

    });
  }

};
