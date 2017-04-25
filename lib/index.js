const cfg = require('../config');

const co = require('co');
const fs = require('mz/fs');
const moment = require('moment');
const bunyan = require('bunyan');
const path = require('path');

const raplaScraper = require('./raplaScraper');
const icsGenerator = require('./icsGenerator');
const log = bunyan.createLogger({name: 'RaplaICSGen'});

const sleep = (duration) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });

const archiveOldEvents = (name) =>
  co(function * (resolve, reject) {

    let archive = [], tmp = [];
    try {
      archive = require(path.join(__dirname, '..', name + 'archive.json'));
    } catch (e) { true; }
    try {
      tmp = require(path.join(__dirname, '..', name + 'tmp.json'));
    } catch (e) { true; }

    tmp.forEach((event) => {
      if (moment(event.end).isBefore(moment(moment().format('YYYY-MM-DD'), 'YYYY-MM-DD'))) {
        archive.push(event);
      }
    });

    yield fs.writeFile(path.join(__dirname, '..', name + 'archive.json'), JSON.stringify(archive));

    return archive;
  });

const generateCalendar = (name, raplaKey, file) =>
  co(function * () {
    log.info('Generating calendar "' + name  + '"');

    const archive = (cfg.archiveOld) ? yield archiveOldEvents(name) : [];

    archive.forEach(event => {
      event.start = moment(event.start);
      event.end = moment(event.end);
      event.lastUpdate = moment(event.lastUpdate);
    });

    const scrapeMoment = moment().startOf('day');
    let events = [];

    for (let i = 0; i < cfg.generateDays; i++) {
      const dateEvents = yield raplaScraper.getDateEvents(scrapeMoment, raplaKey, log);
      //yield sleep(1000);
      events = events.concat(dateEvents);
      scrapeMoment.add(1, 'day');
    }

    yield icsGenerator.writeOutputFile(archive.concat(events), file);

    if (cfg.archiveOld) {
      yield fs.writeFile(path.join(__dirname, '..', name + 'tmp.json'), JSON.stringify(events));
    }
  });

const main = () =>
  co(function * () {
    
    for (let i = 0; i < cfg.calendars.length; i++) {
      let calendar = cfg.calendars[i];
      yield generateCalendar(calendar.name, calendar.raplaKey, calendar.icsOutput);
    }

  });

main().then(() => {
  log.info('Done');
}).catch((err) => {
  log.error('An error occured:');
  log.error(err);
  process.exit(1);
});
