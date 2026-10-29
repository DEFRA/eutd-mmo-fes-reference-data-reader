import { Server } from './server';
import appConfig, { ApplicationConfig } from './config';


const start = async () => {
  ApplicationConfig.loadEnv(process.env);
  await Server.start(appConfig);
}

start().catch((e) => console.error(e));
