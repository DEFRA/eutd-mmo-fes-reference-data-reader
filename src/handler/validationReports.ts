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
          let reportData: any = [];
          const reportType: string = params.reportType?.toLowerCase();
          const fromDate: moment.Moment = moment.utc(qparams.fromdate).startOf('day');
          const toDate: moment.Moment = moment.utc(qparams.todate).endOf('day');
          const asOfDate: moment.Moment = getAsOfDate(qparams.asofdate);
          const areas: string[] = getAreaData(qparams);
          const ext: string = params.ext;
          const documentNumber: string = qparams.documentNumber;
          const exporter: string = qparams.exporter;
          const pln: string = qparams.pln;

          if (!isValidReportType(reportType))
            return h.response('invalid report').code(404)
            
          if (!isValidExtension(params))
            return h.response('missing or invalid extension suffix').code(404)
          
          if (!(moment.utc(qparams.asofdate).isValid()))
            return h.response('asofdate must be valid date').code(400)
          
          const allDas = ['Northern Ireland', 'Isle of Man', 'Channel Islands', 'Guernsey', 'Jersey', 'England', 'Wales', 'Scotland', 'Isle of Man']
          const invalids = areas.filter(_ => (!allDas.includes(_)));
          if (invalids.length > 0)
            return h.response(`invalid areas ${invalids}`).code(400)

          if (!isValidParamDate(qparams))
            return h.response('fromdate and todate are manditory').code(400);

          if (!isValidFromAndTodateDate(fromDate, toDate))
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
            if (verifyCatchcertInvestigationParams(documentNumber, exporter, pln))
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
            if (verifySdpsInvestigationParams(documentNumber, exporter))
              return h.response('missing investigation parameters').code(400);

            const basicData = Array.from(await Report.sdpsInvestigationReport({ fromDate, toDate , documentNumber, exporter }));
            const voidData = Array.from(await Report.sdpsVoidInvestigationReport({ fromDate, toDate , documentNumber, exporter }));
            const blockedData = Array.from(await Report.sdpsBlockedInvestigationReport({fromDate, toDate, documentNumber, exporter}));

            reportData = basicData.concat(voidData).concat(blockedData)
          }

          return getReponseData(reportData, ext, h);
        } catch (e) {
          logger.error(`[CATCHCERTIFICATEVALIDATION][GENERATINGREPORT][ERROR][${e}]`);
          return h.response(e.message).code(500);
        }

      }
    }
  ])
}

const getReponseData = (reportData, ext, h) => {
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
}

const getAreaData = (qparams) => qparams.area && qparams.area !== 'all' ? qparams.area.split(',').map(s => s.trim()) : [];

const getAsOfDate = (asofdate) => !asofdate ? moment.utc() : moment.utc(asofdate)

const verifyCatchcertInvestigationParams = (documentNumber, exporter, pln) => !documentNumber && !exporter && !pln;

const verifySdpsInvestigationParams = (documentNumber, exporter) => !documentNumber && !exporter;

const isValidReportType = (reportType) => ['catchcert', 'sdps', 'catchcertinvestigation', 'sdpsinvestigation'].includes(reportType?.toLowerCase());

const isValidExtension = (params) => params?.ext === 'csv' || params?.ext === 'json';

const isValidParamDate = (qparams) => qparams?.fromdate && qparams?.todate;

const isValidFromAndTodateDate = (fromDate, toDate) => fromDate?.isValid() && toDate?.isValid();

function withNoUndefineds(reportData){
  reportData.forEach(reportLine=>{
    Object.keys(reportLine).forEach(function(key){
       if (reportLine[key] === null || reportLine[key] === undefined) reportLine[key] = ''
    });
  });
}
