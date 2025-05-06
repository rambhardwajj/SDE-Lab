import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { handleZodError } from "../utils/handleZodErrors";
import { validateRegisterData } from "../validators/user.validators";
import { CustomError } from "../utils/CustomError";
import { ResponseStatus } from "../utils/constants";
import { uploadOnCloudinary } from "../configs/cloudinary";
import { logger } from "../utils/logger";
import { envConfig } from "../configs/env";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../generated/prisma";
import ms from "ms";
import { db } from "../configs/db";
import { sendVerificationMail } from "../utils/sendMail";
import { ApiResponse } from "../utils/ApiResponse";

const isPasswordCorrect = async function (password: string, user: User) {
  return await bcrypt.compare(password, user.password);
};

const generateAccessToken = async function (user: User) {
  const accessToken = jwt.sign(
    {
      _id: user.id,
      email: user.email,
      userName: user.userName,
    },
    envConfig.ACCESS_TOKEN_SECRET,
    {
      // Only allow string values that look like valid time durations.
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRY as ms.StringValue,
    }
  );
  return accessToken;
};

const generateRefreshToken = async function (user: User) {
  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      userName: user.userName,
    },
    envConfig.REFRESH_TOKEN_SECRET,
    {
      expiresIn: envConfig.REFRESH_TOKEN_EXPIRY as ms.StringValue,
    }
  );
  return refreshToken;
};

const generateToken = function () {
  const unHashedToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");
  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000);

  return { unHashedToken, hashedToken, tokenExpiry };
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { userName, email, password, fullName, role } = handleZodError(
    validateRegisterData(req.body)
  )

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await db.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new CustomError(ResponseStatus.Conflict, "Email already registered");
  }

  logger.info("existingUser", existingUser);

  const { hashedToken, tokenExpiry, unHashedToken } = generateToken();

  // avatar part
  const avatarLocalPath = req.file?.path;
  let avatarData;
  let avatarUrl;
  if (avatarLocalPath) {
    avatarData = await uploadOnCloudinary(avatarLocalPath);
    avatarUrl = avatarData?.secure_url;
  }

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      userName,
      fullName,
      avatarUrl,
      avatarLocalPath,
      role,
      refreshToken: "",
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: tokenExpiry,
    },
  });

  await sendVerificationMail(user.userName, user.email, unHashedToken);

  res.status(200).json( new ApiResponse(ResponseStatus.Success, {}, "User Register Successfully"))
});

const verifyUser  = asyncHandler( async(req: Request, res: Response) =>{
  const { token } = req.params;

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await db.user.findFirst({
    where:{
      emailVerificationToken : hashedToken
    }
  })

  if (!user) {
    throw new CustomError(ResponseStatus.BadRequest, "Invalid or expired token");
  }

  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
    throw new CustomError(ResponseStatus.BadRequest, "Token expired, time limit exceeded for the user to verify through mail");
  }

  const verifiedUser = await db.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  const accessToken = await generateAccessToken(verifiedUser)
  const refreshToken = await generateRefreshToken(verifiedUser);

  console.log( "acc= ", accessToken)
  console.log("ref= ", refreshToken)

  await db.user.update({
    where: { id: verifiedUser.id },
    data: { refreshToken },
  });

  res
  .status(ResponseStatus.Success)
  .cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
  })
  .cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
  })
  .json(new ApiResponse(ResponseStatus.Success, null, "Register Successful, welcome to SdeLab"));
  
})

export { registerUser, verifyUser };
