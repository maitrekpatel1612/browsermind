import {Express} from 'express';
import {expressServer} from './express/expressServer';
import { dbConnection } from './mongoose';

export async function bootStrapApp(app : Express, PORT : number) : Promise<void> {
    await dbConnection();
    expressServer(app, PORT);
}