import { User } from "../generated/prisma";

export const requiredUserInfo = (user: User) =>{
    const {
        password, 
        emailVerificationToken,
        emailVerificationExpiry,
        resetPasswordToken,
        resetPasswordExpiry,
        createdAt, 
        updatedAt,
        ...requiredUser
    } =user;
    
    return requiredUser;
}