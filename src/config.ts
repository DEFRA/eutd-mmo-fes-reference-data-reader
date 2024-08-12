import dotenv from 'dotenv';
dotenv.config();

export class ApplicationConfig {
  public port: string;
  public inDev: boolean;
  public instrumentationKey: string;
  public cloudRoleName: string;
  public scheduleFishCountriesAndSpeciesJob: string;
  public scheduleVesselsDataJob: string;
  public basicAuthUser: string | any;
  public basicAuthPassword: string | any;
  public boomiUrl: string | any;
  public boomiAuthUser: string | any;
  public boomiAuthCertificate: string | any;
  public boomiAuthPassphrase: string | any;
  public dbConnectionUri: string | any;
  public dbName: string | any;
  public dbConnectionPool: string | any;
  public enableCountryData: boolean;
  public externalAppUrl: string;
  public internalAppUrl: string;
  public azureBlobUrl: string;
  public azureContainer: string;
  public azureSaS: string;
  public defraTradeApiBaseUrl: string;
  public defraTradeApiGetCountriesUri: string;
  public defraTradeApiOauthClientId: string;
  public defraTradeApiOauthClientSecret: string;
  public defraTradeApiOauthScope: string;
  public defraTradeApiOauthTokenUrl: string;
  public defraTradeApiAPIMHeaderName: string;
  public defraTradeApiAPIMHeaderValue: string;
  public refServiceBasicAuthUser: string;
  public refServiceBasicAuthPassword: string;
  public cosmosDBRawConnectionUri: string
  public refBoomiUser: string
  public refBoomiCertificate: string
  public refBoomiPassPhrase: string
  public blobStorageConnection: string

  // service bus queue
  public azureQueueUrl: string;
  public azureReportQueueName: string;
  public azureTradeQueueUrl: string;
  public azureTradeQueueEnabled: boolean
  public azureReportTradeQueueName: string;
  public enableReportToQueue: boolean;

  // vessel not found
  public vesselNotFoundEnabled: boolean;
  public vesselNotFoundName: string;
  public vesselNotFoundPln: string;

  // all species csv file
  public allSpeciesContainerName: string;
  public allSpeciesFileName: string;

  // blob storage
  public maximumDefraValidationReportBatchSize: number;
  public maximumTemporaryDefraValidationReportCollectionBatchUpsert: number;

  // AV API
  public avBaseUrl: string;
  public skipAvScan: boolean;

  // sets eod default rules when going live for the first time
  public eodRulesMigration: boolean;

  public constructor() { }

  // TODO: may be use ProcessEnv as type
  public static loadEnv(env: any): void {
    ApplicationConfig.prototype.basicAuthUser = env.REF_SERVICE_BASIC_AUTH_USER;
    ApplicationConfig.prototype.basicAuthPassword = env.REF_SERVICE_BASIC_AUTH_PASSWORD;
    ApplicationConfig.prototype.dbConnectionUri = env.DB_CONNECTION_URI || env.COSMOS_DB_RW_CONNECTION_URI;
    ApplicationConfig.prototype.boomiAuthUser = env.REF_BOOMI_USER;
    ApplicationConfig.prototype.boomiAuthCertificate = env.REF_BOOMI_CERTIFICATE == 'none' ? undefined : env.REF_BOOMI_CERTIFICATE;
    ApplicationConfig.prototype.boomiAuthPassphrase = env.REF_BOOMI_PASSPHRASE == 'none' ? undefined : env.REF_BOOMI_PASSPHRASE;
    ApplicationConfig.prototype.blobStorageConnection = env.REFERENCE_DATA_AZURE_STORAGE;

    ApplicationConfig.prototype.port = env.PORT || '9000';
    ApplicationConfig.prototype.inDev = env.NODE_ENV === 'development';
    ApplicationConfig.prototype.scheduleFishCountriesAndSpeciesJob = env.REFRESH_SPECIES_JOB;
    ApplicationConfig.prototype.scheduleVesselsDataJob = env.REFRESH_VESSEL_JOB;
    ApplicationConfig.prototype.instrumentationKey = env.INSTRUMENTATION_KEY;
    ApplicationConfig.prototype.cloudRoleName = env.INSTRUMENTATION_CLOUD_ROLE;
    ApplicationConfig.prototype.boomiUrl = env.BOOMI_URL;
    ApplicationConfig.prototype.dbName = env.DB_NAME;
    ApplicationConfig.prototype.dbConnectionPool = env.DB_CONNECTION_POOL;
    ApplicationConfig.prototype.enableCountryData = true;
    ApplicationConfig.prototype.externalAppUrl = env.EXTERNAL_APP_URL;
    ApplicationConfig.prototype.internalAppUrl = env.INTERNAL_ADMIN_URL;
    ApplicationConfig.prototype.azureBlobUrl = env.AZURE_BLOB_URL;
    ApplicationConfig.prototype.azureContainer = env.AZURE_BLOB_CONTAINER;
    ApplicationConfig.prototype.azureSaS = env.AZURE_SAS;

    ApplicationConfig.prototype.defraTradeApiBaseUrl = env.DEFRA_TRADE_API_BASE_URL;
    ApplicationConfig.prototype.defraTradeApiGetCountriesUri = env.DEFRA_TRADE_API_GET_COUNTRIES_URI;
    ApplicationConfig.prototype.defraTradeApiOauthClientId = env.DEFRA_TRADE_API_OAUTH_CLIENT_ID;
    ApplicationConfig.prototype.defraTradeApiOauthClientSecret = env.DEFRA_TRADE_API_OAUTH_CLIENT_SECRET;
    ApplicationConfig.prototype.defraTradeApiOauthScope = env.DEFRA_TRADE_API_OAUTH_SCOPE;
    ApplicationConfig.prototype.defraTradeApiOauthTokenUrl = env.DEFRA_TRADE_API_OAUTH_TOKEN_URL;
    ApplicationConfig.prototype.defraTradeApiAPIMHeaderName = env.DEFRA_TRADE_API_APIM_HEADER_NAME;
    ApplicationConfig.prototype.defraTradeApiAPIMHeaderValue = env.DEFRA_TRADE_API_APIM_HEADER_VALUE;

    // azure Service Bus Queue
    ApplicationConfig.prototype.azureQueueUrl = env.AZURE_QUEUE_CONNECTION_STRING;
    ApplicationConfig.prototype.azureReportQueueName = env.REPORT_QUEUE;
    ApplicationConfig.prototype.azureTradeQueueUrl = env.AZURE_QUEUE_TRADE_CONNECTION_STRING;
    ApplicationConfig.prototype.azureTradeQueueEnabled = env.ENABLE_CHIP_REPORTING === 'true';
    ApplicationConfig.prototype.azureReportTradeQueueName = env.REPORT_QUEUE_TRADE;
    ApplicationConfig.prototype.enableReportToQueue = env.NODE_ENV === 'production';

    // vessel not found
    ApplicationConfig.prototype.vesselNotFoundEnabled = env.VESSEL_NOT_FOUND_ENABLE || true;
    ApplicationConfig.prototype.vesselNotFoundName = env.VESSEL_NOT_FOUND_NAME || 'Vessel not found';
    ApplicationConfig.prototype.vesselNotFoundPln = env.VESSEL_NOT_FOUND_PLN || 'N/A';

    // all species csv file
    ApplicationConfig.prototype.allSpeciesContainerName = env.ALL_SPECIES_DATA_CONTAINER_NAME;
    ApplicationConfig.prototype.allSpeciesFileName = env.ALL_SPECIES_DATA_FILE_NAME;

    // blob storage
    ApplicationConfig.prototype.maximumDefraValidationReportBatchSize = parseInt(env.MAXIMUM_DEFRA_VALIDATION_REPORT_BATCH_SIZE, 10) || 1000;
    ApplicationConfig.prototype.maximumTemporaryDefraValidationReportCollectionBatchUpsert = 10000;

    // av api
    ApplicationConfig.prototype.avBaseUrl = env.AV_BASE_URL;
    ApplicationConfig.prototype.skipAvScan = env.SKIP_AV_SCAN === 'true';

    // sets eod default rules when going live for the first time
    ApplicationConfig.prototype.eodRulesMigration = env.EOD_RULES_MIGRATION === 'true';
  }

}

export default new ApplicationConfig();