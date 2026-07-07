import express, {Router} from 'express';
import cors from 'cors';
import {Express, NextFunction, Request, Response} from 'express';

import path from 'node:path';

export function expressServer(app : Express, PORT : number) : void {
    const router : Router = express.Router();
}