import { Server } from './server';
import appConfig, { ApplicationConfig } from './config';


const start = async (): Promise<void> => {
  ApplicationConfig.loadEnv(process.env);
  await Server.start(appConfig);
}

void start().catch(e => console.error(e));
