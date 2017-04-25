const cfg = require('../config');

const cheerio = require('cheerio');
const moment = require('moment');
const request = require('request');
const regeneratorRuntime = require('regenerator-runtime');
const entities = new (require('html-entities').XmlEntities);


const weekBlockToDateEvent = ($, weekBlock, momentDate, log) => {
  const title = entities.decode($(weekBlock).find('a').html()
    .match(new RegExp('<br>' + '(.*)' + '<span class="tooltip">'))[1]);

  const durationString =
    $(weekBlock).find('a > span.tooltip > div').eq(1).html();

  try {
    const dateStr = durationString.split(' ')[1];
    const startTimeStr = durationString.split(' ')[2].split('-')[0];
    const endTimeStr = durationString.split(' ')[2].split('-')[1];

    const start = moment(`${dateStr} ${startTimeStr}`, 'DD.MM.YYYY HH:mm');
    const end = moment(`${dateStr} ${endTimeStr}`, 'DD.MM.YYYY HH:mm');

    const person = $(weekBlock).find('span.person').html();

    const resources = []
    $(weekBlock).find('span.resource').each(function() {
      resources.push($(this).html());
    });

    return {
      title,
      start,
      end,
      person,
      resources,
      lastUpdate: moment()
    };
  } catch (e) {
    log.warn("Parsing error:", e);

    return {
      title: "Parsing error. Look at RAPLA!",
      start: moment(momentDate).add(8, 'hours'),
      end: moment(momentDate).add(18, 'hours'),
      person: '-',
      resources: ['-'],
      lastUpdate: moment()
    };
  }
};

module.exports = {

  getDateEvents(momentDate, raplaKey, log) {
    return new Promise((resolve, reject) => {
      const url = `${cfg.rapla.baseURL}?key=${raplaKey}` +
        `&day=${momentDate.date()}` +
        `&month=${momentDate.month() + 1}` +
        `&year=${momentDate.year()}`;

      request(url, (err, res, body) => {
        if (err) {
          return reject(err);
        } else if (res.statusCode !== 200) {
          return reject(new Error('Status Code ' + res.statusCode));
        }

        const $ = cheerio.load(body, { decodeEntities: false });
        const dateEvents = [];

        $('td.week_block').each(function() {
          const dateEvent = weekBlockToDateEvent($, this, momentDate, log);

          if (dateEvent.start.isSameOrAfter(momentDate) &&
          dateEvent.start.isBefore(moment(momentDate).add(1, 'days'))) {
            dateEvents.push(dateEvent);
          }
        });

	for (let i = 0; i < dateEvents.length; i++) {
          let dateEvent = dateEvents[i];

          if (dateEvent.title.indexOf('Parsing error.') > -1) {
	    return resolve([dateEvent]);
	  }
	}

        resolve(dateEvents);
      });
    });
  }

};
