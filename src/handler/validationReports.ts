import * as moment from 'moment'
import * as Hapi from '@hapi/hapi'
import * as Report from '../landings/orchestration/batchReport'
import logger from '../logger'
import { CsvConverter } from '../utils/csvConverter'


export const validationReportsRoutes = (server: Hapi.Server) => {

  server.route([
    {
      method: 'GET',
      path: '/v1/validationreports/{reportType}.{ext}',

      options: {
        security: true
      },

      handler: async (req, h) => {

        try {

          const qparams = req.query;
          const params = req.params;
          let reportData: any[] = [];
          let reportType: string;
          const fromDate: moment.Moment = moment.utc(qparams.fromdate).startOf('day');
          const toDate: moment.Moment = moment.utc(qparams.todate).endOf('day');
          let asOfDate: moment.Moment;
          let areas: string[];
          let ext: string;
          let documentNumber: string;
          let exporter: string;
          let pln: string;

          if (['catchcert', 'sdps', 'catchcertinvestigation', 'sdpsinvestigation']
            .includes(params.reportType.toLowerCase()))
              reportType = params.reportType.toLowerCase()
          else
            return h.response('invalid report').code(404)

          if (params.ext === 'csv' || params.ext === 'json') {
            ext = params.ext
          } else {
            return h.response('missing or invalid extension suffix').code(404)
          }

          if (qparams.asofdate) {
            asOfDate = moment.utc(qparams.asofdate)
            if (!asOfDate.isValid())
              return h.response('asofdate must be valid date').code(400)
          } else {
            asOfDate = moment.utc()
          }

          if (qparams.area) {

            const allDas = ['Northern Ireland', 'Isle of Man', 'Channel Islands', 'Guernsey', 'Jersey', 'England', 'Wales', 'Scotland', 'Isle of Man']

            if (qparams.area === 'all') {
              areas = []
            } else {

              areas = qparams.area.split(',').map(s => s.trim());

              const invalids = areas.filter(_ => (!allDas.includes(_)));

              if (invalids.length > 0)
                return h.response(`invalid areas ${invalids}`).code(400)

            }

          } else {
            areas = []
          }

          if (!(qparams.fromdate && qparams.todate))
            return h.response('fromdate and todate are manditory').code(400);

          if (!(fromDate.isValid() && toDate.isValid()))
            return h.response('fromdate and todate must be valid date').code(400);


          if (reportType === 'catchcert') {
            logger.info(`[CATCH-CERT-REPORT][START]${moment.utc()}`)
            const basicData = Array.from(await Report.catchCertReport(fromDate, toDate, asOfDate, areas));
            logger.info(`[BATCH-REPORT][GENERATE-BATCH-REPORT][END]${moment.utc()}`)
            const voidData = Array.from(await Report.catchCertVoidReport(fromDate, toDate, asOfDate, areas));
            const blockedData = Array.from(await Report.catchCertBlockedReport(fromDate,toDate,areas));
            reportData = basicData.concat(voidData).concat(blockedData)
            logger.info(`[CATCH-CERT-REPORT][END]${moment.utc()}`)
          } else if (reportType === 'catchcertinvestigation') {

            /* how to handle case? */

            documentNumber = qparams.documentNumber
            exporter = qparams.exporter
            pln = qparams.pln

            if (!documentNumber && !exporter && !pln)
              return h.response('missing investigation parameters').code(400)

            const basicData = Array.from(await Report.catchCertInvestigationReport({ fromDate, toDate , documentNumber, exporter, pln, asOfDate }));
            const voidData = Array.from(await Report.catchCertVoidInvestigationReport({fromDate,toDate,documentNumber,exporter,pln,asOfDate}));
            const blockedData = Array.from(await Report.catchCertBlockedInvestigationReport({fromDate,toDate,documentNumber,exporter,pln}));

            reportData = basicData.concat(voidData).concat(blockedData)

          } else if (reportType === 'sdps') {
            const basicData = Array.from(await Report.sdpsReport(fromDate, toDate, areas));
            const voidData = Array.from(await Report.sdpsVoidReport(fromDate, toDate, areas));
            const blockedData = Array.from(await Report.sdpsBlockedReport(fromDate,toDate, areas));

            reportData = basicData.concat(voidData).concat(blockedData)
          } else if (reportType == 'sdpsinvestigation') {
            documentNumber = qparams.documentNumber;
            exporter = qparams.exporter;

            if (!documentNumber && !exporter)
              return h.response('missing investigation parameters').code(400);

            const basicData = Array.from(await Report.sdpsInvestigationReport({ fromDate, toDate , documentNumber, exporter }));
            const voidData = Array.from(await Report.sdpsVoidInvestigationReport({ fromDate, toDate , documentNumber, exporter }));
            const blockedData = Array.from(await Report.sdpsBlockedInvestigationReport({fromDate, toDate, documentNumber, exporter}));

            reportData = basicData.concat(voidData).concat(blockedData)
          }

          if (reportData.length === 0)
            return h.response().code(204);

          if (ext === 'csv') {
            const csvConverter = new CsvConverter();
            const csvReport = csvConverter.generateCatchCertificateReport(reportData);
            return h.response(csvReport).type('text/csv');
          }
          if (ext === 'json') {
            withNoUndefineds(reportData);
            return h.response(reportData).type('application/json')
          }

        } catch (e) {
          logger.error(`[CATCHCERTIFICATEVALIDATION][GENERATINGREPORT][ERROR][${e}]`);
          return h.response(e.message).code(500);
        }

      }
    }
  ])
}

function withNoUndefineds(reportData){
  reportData.forEach(reportLine=>{
    Object.keys(reportLine).forEach(function(key){
       if (reportLine[key] === null || reportLine[key] === undefined) reportLine[key] = ''
    });
  });
}
