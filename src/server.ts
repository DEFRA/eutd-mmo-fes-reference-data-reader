import appInsights from './app-insights';
import { Boom } from '@hapi/boom';

import * as fs from 'fs';
import * as Hapi from '@hapi/hapi';
import * as cron from 'node-cron';
const mongoose = require('mongoose');

import logger from './logger';

import { loadFishCountriesAndSpecies, loadVessels, loadExporterBehaviour, loadEodSettings } from './data/cache';
import { cleanUpEodRules, seedEodRules } from './landings/persistence/eodSettings';
import appConfig, { ApplicationConfig } from './config';

import { speciesRoutes } from './handler/species';
import { vesselRoutes } from './handler/vessel';
import { validationReportsRoutes } from './handler/validationReports';
import { landingQueueRoutes } from './handler/landingQueue';
import { extendedDataRoutes } from './handler/extendedData';
import { certificateRoutes } from './handler/certificates';
import { onlineValidationRoutes } from './handler/onlineValidation';
import { preApprovalDocumentRoutes } from './handler/preApprovedDocuments';
import { seasonalFishRoutes } from './handler/seasonalFish';
import { addressesRoutes } from './handler/addresses';
import { countriesRoutes } from './handler/countries';
import { conversionFactorRoutes } from './handler/conversionFactors';
import { dataHubRoutes } from './handler/dataHub';
import { riskingRoutes } from './handler/risking';
import { virusCheckerRoutes } from './handler/virusChecker';
import { uploadValidatorRoutes } from './handler/uploadValidator';
import { eodRoutes } from './handler/eod';
import { isLegallyDueRoute } from './handler/isLegallyDue';
import { purgeRoutes } from './handler/purge';
import { gearTypeRoutes } from './handler/gearTypes';
import { rfmoRoutes } from './handler/rfmo';

const Joi = require('joi');

export class Server {
  private static instance: Hapi.Server;

  public static async start(config: ApplicationConfig, inTest = false): Promise<void> {
    try {
      appInsights();

      if (!inTest) {
        logger.info(`[DBNAME] ${ApplicationConfig.prototype.dbName}`);
        const options = {
          useNewUrlParser: true,
          dbName: ApplicationConfig.prototype.dbName,
          connectTimeoutMS: 60000,
          socketTimeoutMS: 600000,
          serverSelectionTimeoutMS: 60000
        }
        await mongoose.connect(ApplicationConfig.prototype.dbConnectionUri, options).catch(err => {console.log(err)});
      }

      await seedEodRules();
      await cleanUpEodRules();

      await Promise.all([
        loadFishCountriesAndSpecies(),
        loadVessels(),
        loadExporterBehaviour(),
        loadEodSettings()
      ]);

      if (!inTest) {
        scheduleFishCountriesAndSpeciesJob();
        scheduleVesselsJob();
      }

      Server.instance = new Hapi.Server({
        port: parseInt(config.port)
      });
      Server.onRequest();
      Server.onPreResponse();

      Server.instance.validator(Joi);

      if (!config.inDev && !inTest) {
        await Server.instance.register(require('@hapi/basic'));
        Server.instance.auth.strategy('simple', 'basic', { validate });
        Server.instance.auth.default('simple');
      }
      setupRoutes(Server.instance);
      await Server.instance.start();
      logger.info('Server successfully started on port ' + config.port);
    } catch (e) {
      logger.error(e);
      logger.error('Cannot start server');
    }
  }

  public static async stop(): Promise<void> {
    await Server.instance.stop();
  }

  public static async inject(props: string | Hapi.ServerInjectOptions): Promise<Hapi.ServerInjectResponse> {
    return await Server.instance.inject(props);
  }

  private static onRequest() {
    Server.instance.ext('onRequest', function (request: Hapi.Request<Hapi.ReqRefDefaults>, h) {

      logger.info({
        // requestId: request.id, // does id exist on request object? it seems to be undefined regardless
        data: {
          method: request.method,
          path: request.path
        }
      },
        'on-request');

      return h.continue;
    });
  }

  private static onPreResponse() {
    Server.instance.ext('onPreResponse', function (request: Hapi.Request<Hapi.ReqRefDefaults>, h) {
      const { response } = request;

      const permissions =
        'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), layout-animations=(), legacy-image-formats=*, magnetometer=(), microphone=(), midi=(), oversized-images=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), sync-xhr=*, usb=(), vr=(), screen-wake-lock=(), web-share=(), xr-spatial-tracking=()';

      if (response instanceof Boom) {
        response.output.headers['Permissions-Policy'] = permissions;
      } else {
        response.header('Permissions-Policy', permissions);
      }

      return h.continue;
    });
  }
}

const scheduleFishCountriesAndSpeciesJob = () => {
  logger.info(`Scheduled job to run at ${appConfig.scheduleFishCountriesAndSpeciesJob}`);
  cron.schedule(appConfig.scheduleFishCountriesAndSpeciesJob, async () => {
    logger.info('Running scheduled job at ', new Date());
    await loadFishCountriesAndSpecies();
  });
}

const scheduleVesselsJob = () => {
  logger.info(`Scheduled job to run at ${appConfig.scheduleVesselsDataJob}`);
  cron.schedule(appConfig.scheduleVesselsDataJob, async () => {
    logger.info('Running scheduled job at ', new Date());
    await loadVessels();
  });
}

const validate = (request, username, password, _h) => {
  const isValid = username === appConfig.basicAuthUser && password === appConfig.basicAuthPassword;
  return {
    isValid,
    credentials: {

    }
  };
}

const staticRoutesWithoutAuth = server => {
  server.route([
    {
      method: 'GET',
      path: '/',
      options: {
        auth: false,
        description: 'Just a sanity check',
        tags: ['api']
      },
      handler: async (_request, _h) => {
        return 'Server is successfully running - please use one of the API endpoints';
      }
    },
    {
      method: 'GET',
      path: '/health',
      options: {
        auth: false,
        description: 'Health check',
        tags: ['api', 'health']
      },
      handler: async (request, h) => {
        return h.response({ status: 'UP' });
      }
    },
    {
      method: 'GET',
      path: '/v1/version-info',
      options: {
        auth: false,
        description: 'Version',
        tags: ['api', 'version']
      },
      handler: async (request, h) => {
        return h.response({
          gitHash: fs.readFileSync(__dirname + '/../githash', 'utf8')
        });
      }
    }
  ])
}

const setupRoutes = server => {
  staticRoutesWithoutAuth(server);
  speciesRoutes(server);
  vesselRoutes(server);
  validationReportsRoutes(server);
  landingQueueRoutes(server);
  extendedDataRoutes(server);
  certificateRoutes(server);
  onlineValidationRoutes(server);
  preApprovalDocumentRoutes(server);
  seasonalFishRoutes(server);
  countriesRoutes(server);
  addressesRoutes(server);
  conversionFactorRoutes(server);
  dataHubRoutes(server);
  riskingRoutes(server);
  eodRoutes(server);
  isLegallyDueRoute(server);
  virusCheckerRoutes(server);
  uploadValidatorRoutes(server);
  purgeRoutes(server);
  gearTypeRoutes(server);
  rfmoRoutes(server)
}
