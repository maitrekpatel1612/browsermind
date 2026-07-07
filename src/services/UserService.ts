import { GoogleUserType } from '@/app/types/user-types';
import {User} from '@/models/userSchema';
;


export class UserService {
    
    /**
     * & Singleton pattern to get the instance of UserService
    */
    private static instance : UserService;
    public static getInstance() : UserService   {
        if(!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    async createUser(userProps : GoogleUserType, token : {accessToken : string, refreshToken : string})
    {
        //Step 1: Destructure the user properties from the GoogleUserType object
        const { sub : id , name , picture , email } = userProps?._json;

        //Step 2: Check if the user already exists in the database
        const exisitingUser = await User.findOne({ email : email});

        //Step 3: Create a new user in the database using the User model
        if(!exisitingUser) {
            
            const newUser = new User({
                name : name,
                email : email,
                image : picture,
                googleAccessToken : token?.accessToken,
                googleRefreshToken : token?.refreshToken,
                googleId : id
            });

            await newUser.save();
        }
        // Step 4: If the user already exists, you can update their access and refresh tokens if needed
        else
        {
            const user = await User.findByIdAndUpdate(exisitingUser._id, {
                googleAccessToken : token?.accessToken,
                googleRefreshToken : token?.refreshToken
            }, { new : true , runValidators : true });

            const updatedUser = user?.toObject(); 
            return {
                authData : { ...updatedUser },
                message : 'User already exists, tokens updated successfully'
            }
        }
    }
}  