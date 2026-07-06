import express, {Router} from 'express';
import cors from 'cors';
import {Express, NextFunction, Request, Response} from 'express';
import path from 'node:path';
import {handleExpressError} from '../exceptions/handleExpressError';



export function expressServer(app : Express, PORT : number) : void {
    const router : Router = express.Router();

    //Middleware configuration
    app.use(cors({
        origin: process.env.FRONT_APP_URL,
        credentials: true,
    }));

    app.use(express.json());
    app.use(express.urlencoded({extended: true}));
    app.use('/assets', express.static(path.join(process.cwd(), 'public')));
    app.use(handleExpressError);

    // Start the server
    app.get('/', async (req: Request, res: Response) => {
        res.status(200).json({
            message: 'Server is running',
        });
    });

    app.listen(PORT, () => {
        console.log(`Express Server is running at http://localhost:${PORT}`);
    });
}