import express from 'express';
import 'dotenv/config'; 
import {bootStrapApp} from './app/bootstrap/index';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
bootStrapApp(app, PORT)