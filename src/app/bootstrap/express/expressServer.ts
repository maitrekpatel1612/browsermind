import express, { Router } from 'express';
import cors from 'cors';
import { Express, NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { handleExpressError } from '../exceptions/handleExpressError';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserService } from '@/services/UserService';
import { postChatStream } from '@/http/controllers/chatController';
import { BrowserAgent } from '@/browser-agent/BrowserAgents';
import { readChatHistoryTool } from '@/tools/chat-history/chathistoryTools';

export function expressServer(app: Express, PORT: number): void {

    //@ Router configuration
    const router = express.Router();

    //@Middleware configuration
    app.use(cors({
        origin: process.env.FRONT_APP_URL,
        credentials: true,
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/assets', express.static(path.join(process.cwd(), 'public')));
    // app.use(handleExpressError);

    //@ Start the server
    app.get('/', async (req: Request, res: Response) => {
        res.status(200).json({
            message: 'Server is running',
        });
    });


    //@ Session configuration
    const sessionConfig = {
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI as string,
            collectionName: 'sessions',
        }),
        secret: process.env.COOKIE_KEY as string,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false, // Set to true if using HTTPS 
        }
    }

    if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1); // trust first proxy [means : if you are behind a reverse proxy like Nginx, Express will trust the X-Forwarded-* headers]
        sessionConfig.cookie.secure = true; // Serve secure cookies in production
    }

    //@ Passport configuration
    app.use(session(sessionConfig));
    app.use(passport.initialize());
    app.use(passport.session());

    app.use(handleExpressError);


    //~ Authentication Routes [Google OAuth]
    //@ Passport Google OAuth Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env.CALLBACK_URL as string,
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        /**
         *  Here you can handle the user profile and save it to your database if needed, For now, we will just return the profile
         *  */
        const userService = UserService.getInstance();
        const user = await userService.createUser(profile, { accessToken, refreshToken });
        return done(null, user);
    }));

    // Serialize and deserialize user for session management [Meaning : When a user logs in, their information is stored in the session. When they make subsequent requests, their information is retrieved from the session.]
    passport.serializeUser((user: any, done: any) => {
        done(null, user);
    });

    passport.deserializeUser((user: any, done: any) => {
        try {
            // Check if the user is authenticated and has a valid session in the database
            done(null, user);
        }
        catch (err) {
            done(err, null);
        }
    });


    // Google OAuth routes
    app.get(
        '/auth/google',
        passport.authenticate('google',
            {
                scope: ['profile', 'email'],
                accessType: 'offline', // Request offline access to get a refresh token
                prompt: 'consent', // Force the consent screen to show every time
            }
        )
    );


    // Google OAuth callback route
    app.get(
        '/auth/google/callback',
        passport.authenticate('google',
            {
                failureRedirect: '/auth/login',
                successRedirect: process.env.FRONT_APP_URL as string, // Redirect to the front-end application after successful login
            }
        )
    );

    // Logout route
    app.get('/auth/logout', (req: Request, res: Response, next: NextFunction) => {
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            req.session?.destroy((err) => {
                if (err) {
                    return next(err);
                }
                res.clearCookie('connect.sid'); // Clear the session cookie
                res.json({ message: 'Logged out successfully' });
            });
        });
    });


    //~ Agent Collaboration Routes 
    // Chat history route
    app.get('/chathistory', readChatHistoryTool.invoke);
    // Chat Stream route
    app.post('/chats', postChatStream)

    // Test route for Browser Agent
    app.get('/test', async (req: Request, res: Response, next: NextFunction) => {

        const { invokeBrowserAgent } = await BrowserAgent()
        const fullContent = await invokeBrowserAgent("Visit the url and tell me what is the content of the page https://maitrekpatel.in and give me a summary of the content in 3 sentences.")
        res.json({ result: fullContent })
    })


    //~ Start Express Server 
    app.listen(PORT, () => {
        console.log(`Express Server is running at http://localhost:${PORT}`);
    });
}