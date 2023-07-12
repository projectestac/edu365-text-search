/*!
 *  File    : searchStats.js
 *  Created : 10/07/2023
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  API to retrieve search stats
 *
 *  @license EUPL-1.2
 *  @licstart
 *  (c) 2019 Educational Telematic Network of Catalonia (XTEC)
 *
 *  Licensed under the EUPL, Version 1.2 or -as soon they will be approved by
 *  the European Commission- subsequent versions of the EUPL (the "Licence");
 *  You may not use this work except in compliance with the Licence.
 *
 *  You may obtain a copy of the Licence at:
 *  https://joinup.ec.europa.eu/software/page/eupl
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  Licence for the specific language governing permissions and limitations
 *  under the Licence.
 *  @licend
 */

const S_ = require('sequelize');
const addDays = require('date-fns/addDays');
const parse = require('date-fns/parse');
const { zonedTimeToUtc } = require('date-fns-tz');
const { SearchModel } = require('./db');

function getSearchStatsFn({ config, logger }) {

  return async (req, res, next) => {

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`/search-stats called from ${ip}`);

    try {
      // Check auth
      if (config.AUTH_SECRET !== req.query.auth)
        throw new Error('Invalid request!');

      logger.info(req.query);
      const pageSize = req.query.page_size || 10;
      const page = req.query.page || 1;
      const offset = req.query.offset || page * pageSize - pageSize;
      const order = req.query.order || ["createdAt", "DESC"];
      const search = req.query.search || [];
      const tz = req.query.tz || "Europe/Madrid";

      let startDate;
      if (req.query.start_date)
        startDate = new Date(req.query.start_date);
      else
        startDate = new Date('1900-01-01');

      let endDate;
      if (req.query.end_date)
        endDate = new Date(req.query.end_date);
      else
        endDate = new Date();

      // Add a day as time will be always 0:00
      endDate = addDays(endDate, 1);

      const Op = S_.Op;

      const filters = {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      };

      search.forEach(function (filter) {
        switch (filter[0]) {
          case 'id':
            filters.id = { [Op.like]: `%${filter[1]}%` };
            break;
          case 'text':
            filters.text = { [Op.like]: `%${filter[1]}%` };
            break;
          case 'ip':
            filters.ip = { [Op.like]: `%${filter[1]}%` };
            break;
          case 'num_results':
            let parts = filter[1].split('-');
            let start = parseInt(parts[0]);
            let end = parseInt(parts[2]);

            if (start || end) {
              filters.num_results = {};
              if (start)
                filters.num_results = { ...filters.num_results, ...{ [Op.gte]: start } };
              if (end)
                filters.num_results = { ...filters.num_results, ...{ [Op.lte]: end } };
            }
            break;
          case 'createdAt':
            let dateParts = filter[1].split('-');
            let startDate = dateParts[0];
            if (startDate)
              startDate = parse(startDate, 'dd/MM/yyyy', new Date());

            let endDate = dateParts[2];
            if (endDate) {
              endDate = parse(endDate, 'dd/MM/yyyy', new Date());
              // Add a day as time will be always 0:00
              endDate = addDays(endDate, 1);
            }

            if (startDate || endDate) {
              if (startDate) {
                startDate = zonedTimeToUtc(startDate, tz);
                filters.createdAt = { ...filters.createdAt, ...{ [Op.gte]: startDate } };
              }
              if (endDate) {
                endDate = zonedTimeToUtc(endDate, tz);
                filters.createdAt = { ...filters.createdAt, ...{ [Op.lt]: endDate } };
              }
            }
            break;
        }
      });

      const result = await SearchModel.findAndCountAll({
        limit: pageSize,
        offset: offset,
        attributes: { exclude: ['updatedAt'] },
        where: filters,
        order: order
      });
      logger.info(`Number of results: ${result.count}`);
      res.append('content-type', 'application/json; charset=utf-8');

      const response = {
        draw: req.query.draw || 0,
        recordsTotal: result.count,
        recordsFiltered: result.count,
        data: result.rows,
      };
      res.end(JSON.stringify(response, null, 1));

    } catch (err) {
      next(err.toString());
    }
  };
}

function getMostWantedFn({ config, logger }) {
  return async (req, res, next) => {

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`/stats/most-wanted called from ${ip}`);

    try {
      // Check auth
      if (config.AUTH_SECRET !== req.query.auth)
        throw new Error('Invalid request!');

      logger.info(req.query);
      const pageSize = req.query.page_size || 10;
      const page = req.query.page || 1;
      const offset = req.query.offset || page * pageSize - pageSize;
      const order = req.query.order || ["num_searches", "DESC"];
      const search = req.query.search || [];
      const tz = req.query.tz || "Europe/Madrid";

      let startDate;
      if (req.query.start_date)
        startDate = new Date(req.query.start_date);
      else
        startDate = new Date('1900-01-01');

      let endDate;
      if (req.query.end_date)
        endDate = new Date(req.query.end_date);
      else
        endDate = new Date();

      // Add a day as time will be always 0:00
      endDate = addDays(endDate, 1);

      const Op = S_.Op;

      const filters = {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      };
      const having = [];

      search.forEach(function (filter) {
        switch (filter[0]) {
          case 'text':
            filters.text = { [Op.like]: `%${filter[1]}%` };
            break;
          case 'num_searches':
            let parts = filter[1].split('-');
            let start = parseInt(parts[0]);
            let end = parseInt(parts[2]);

            if (start || end) {
              if (start) {
                having.push(S_.where(S_.fn('COUNT', S_.col('text')), '>=', start));
              }
              if (end) {
                having.push(S_.where(S_.fn('COUNT', S_.col('text')), '<=', end));
              }
            }
            break;
          case 'createdAt':
            let dateParts = filter[1].split('-');
            let startDate = dateParts[0];
            if (startDate)
              startDate = parse(startDate, 'dd/MM/yyyy', new Date());

            let endDate = dateParts[2];
            if (endDate) {
              endDate = parse(endDate, 'dd/MM/yyyy', new Date());
              // Add a day as time will be always 0:00
              endDate = addDays(endDate, 1);
            }

            if (startDate || endDate) {
              if (startDate) {
                startDate = zonedTimeToUtc(startDate, tz);
                filters.createdAt = { ...filters.createdAt, ...{ [Op.gte]: startDate } };
              }
              if (endDate) {
                endDate = zonedTimeToUtc(endDate, tz);
                filters.createdAt = { ...filters.createdAt, ...{ [Op.lt]: endDate } };
              }
            }
            break;
        }
      });

      // Fix ordering by an aggregate column
      order.forEach(function (o) {
        if (o[0] === 'num_searches') {
          o[0] = S_.col(o[0]);
        }
      });

      let lower_trim_text = S_.fn('lower', S_.fn('trim', S_.col('text')));
      const result = await SearchModel.findAndCountAll({
        offset: offset,
        attributes: [
          [lower_trim_text, 'text'],
          [S_.fn('COUNT', S_.col('text')), 'num_searches'],
          'createdAt'
        ],
        where: filters,
        having: having,
        order: order,
        group: [lower_trim_text],
        limit: pageSize,
      });
      logger.info(`Number of results: ${result.count.length}`);
      res.append('content-type', 'application/json; charset=utf-8');

      const response = {
        draw: req.query.draw || 0,
        recordsTotal: result.count.length,
        recordsFiltered: result.count.length,
        data: result.rows,
      };
      res.end(JSON.stringify(response, null, 1));

    } catch (err) {
      next(err.toString());
    }
  };
}

module.exports = {
  getSearchStatsFn,
  getMostWantedFn,
};