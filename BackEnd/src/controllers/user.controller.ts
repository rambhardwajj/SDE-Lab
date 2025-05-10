import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { handleZodError } from "../utils/handleZodErrors";
import {
  validateEmailData,
  validateLoginData,
  validatePasswordData,
  validateRegisterData,
} from "../validators/user.validators";
import { CustomError } from "../utils/CustomError";
import { ResponseStatus } from "../utils/constants";
import { uploadOnCloudinary } from "../configs/cloudinary";
import { logger } from "../utils/logger";
import { envConfig } from "../configs/env";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../generated/prisma";
import ms, { StringValue } from "ms";
import { db } from "../configs/db";
import { sendResetPasswordMail, sendVerificationMail } from "../utils/sendMail";
import { ApiResponse } from "../utils/ApiResponse";
import { requiredUserInfo } from "../utils/requiredUserInfo";
import { DecodedUser } from "../types";

const isPasswordCorrect = async function (password: string, user: User) {
  return await bcrypt.compare(password, user.password);
};

const generateAccessToken = async function (user: User, sessionId: string) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      userName: user.userName,
      role: user.role,
      sessionId,
    },
    envConfig.ACCESS_TOKEN_SECRET,
    {
      // Only allow string values that look like valid time durations.
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRY as ms.StringValue,
    }
  );
  return accessToken;
};

const generateRefreshToken = async function (user: User, sessionId: string) {
  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      userName: user.userName,
      sessionId,
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
  );

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
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: tokenExpiry,
    },
  });

  await sendVerificationMail(user.userName, user.email, unHashedToken);

  const requiredUser = requiredUserInfo(user);

  res
    .status(200)
    .json(
      new ApiResponse(
        ResponseStatus.Success,
        requiredUser,
        "User Register Successfully"
      )
    );
});

const verifyUser = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await db.user.findFirst({
    where: {
      emailVerificationToken: hashedToken,
    },
  });
  if (!user)
    throw new CustomError(
      ResponseStatus.BadRequest,
      "Invalid or expired token"
    );

  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date())
    throw new CustomError(
      ResponseStatus.BadRequest,
      "Token expired, time limit exceeded for the user to verify through mail"
    );

  const verifiedUser = await db.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: null,
      isEmailVerified: true,
      emailVerificationExpiry: null,
    },
  });

  // Session Creation
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ipAddress = req.ip || "Unknown";
  const sessionExpiry = new Date(
    Date.now() + ms(envConfig.REFRESH_TOKEN_EXPIRY as StringValue)
  );

  // console.log("agent= ", userAgent);
  // console.log("ip= ", ipAddress);

  const activeSessions = await db.session.count({
    where: { userId: user.id },
  });

  if (activeSessions >= 5) {
    throw new CustomError(
      ResponseStatus.Forbidden,
      "You have exceeded the maximum number of devices (5). Please logout from another device to continue."
    );
  }

  const session = await db.session.create({
    data: {
      refreshToken: "",
      userId: user.id,
      userAgent,
      ipAddress,
      expiresAt: sessionExpiry,
    },
  });

  const accessToken = await generateAccessToken(verifiedUser, session.id);
  const refreshToken = await generateRefreshToken(verifiedUser, session.id);

  // console.log("acc= ", accessToken);
  // console.log("ref= ", refreshToken);

  await db.session.update({
    where: { id: session.id },
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
    .json(
      new ApiResponse(
        ResponseStatus.Success,
        null,
        "Register Successful, welcome to SdeLab"
      )
    );
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = handleZodError(validateLoginData(req.body));
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ipAddress = req.ip || "Unknown";
  const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });
  if (!user) {
    throw new CustomError(ResponseStatus.NotFound, "User not found");
  }

  if (!isPasswordCorrect(password, user)) {
    throw new CustomError(ResponseStatus.Unauthorized, "Incorrect Password");
  }

  // console.log(user.id, userAgent, ipAddress);

  const existingSession = await db.session.findFirst({
    where: {
      userId: user.id,
      userAgent,
      ipAddress,
    },
  });
  // console.log(existingSession);

  const activeSessions = await db.session.count({
    where: { userId: user.id },
  });
  if (activeSessions >= 5 && !existingSession) {
    throw new CustomError(
      ResponseStatus.Forbidden,
      "Maximum number of active sessions reached"
    );
  }

  let accessToken;
  let refreshToken;
  if (existingSession) {
    accessToken = await generateAccessToken(user, existingSession.id);
    refreshToken = await generateRefreshToken(user, existingSession.id);
    await db.session.update({
      where: { id: existingSession.id },
      data: {
        refreshToken,
        expiresAt: sessionExpiry,
      },
    });
  } else {
    const session = await db.session.create({
      data: {
        refreshToken: "",
        userId: user.id,
        userAgent,
        ipAddress,
        expiresAt: sessionExpiry,
      },
    });
    accessToken = await generateAccessToken(user, session.id);
    refreshToken = await generateRefreshToken(user, session.id);
    await db.session.update({
      where: { id: session.id },
      data: {
        refreshToken,
        expiresAt: sessionExpiry,
      },
    });
  }

  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
    })
    .json(new ApiResponse(ResponseStatus.Success, null, "Login Successful"));
});

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const sessionId = req.user.sessionId;
  if (!sessionId || !userId) {
    throw new CustomError(400, "User session not found");
  }

  // Remove the current session from DB
  await db.session.delete({
    where: { id: sessionId },
  });

  // const userInfo = await db.user.findUnique({
  //   where: { id },
  // });
  // if (!userInfo) {
  //   throw new CustomError(400, "No User exists");
  // }
  // await db.user.update({
  //   where: { id },
  //   data: {
  //     refreshToken: null,
  //   },
  // });

  res
    .status(ResponseStatus.Success)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(
      new ApiResponse(ResponseStatus.Success, null, "Logged out successfully")
    );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = handleZodError(validateEmailData(req.body));

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new CustomError(400, "User not found");
  }

  if (user.isEmailVerified) {
    throw new CustomError(400, "User already verified..");
  }

  const { hashedToken, tokenExpiry, unHashedToken } = generateToken();

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: tokenExpiry,
    },
  });

  await sendVerificationMail(user.userName, user.email, unHashedToken);

  res
    .status(200)
    .json(
      new ApiResponse(
        ResponseStatus.Success,
        null,
        "Email verification link sent successfully"
      )
    );
});

const forgetPasswrod = asyncHandler(async (req, res) => {
  const { email } = handleZodError(validateEmailData(req.body));
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw new CustomError(
      ResponseStatus.NotFound,
      "User with this email does not exist"
    );
  }

  const { hashedToken, tokenExpiry, unHashedToken } = generateToken();
  await db.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: tokenExpiry,
    },
  });

  await sendResetPasswordMail(user.email, user.userName, unHashedToken);

  res.status(ResponseStatus.Success).json({
    success: true,
    message: "Password reset link sent to your email",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = handleZodError(validatePasswordData(req.body));

  if (!token) {
    throw new CustomError(ResponseStatus.NotFound, "Token is required");
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await db.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new CustomError(
      ResponseStatus.Unauthorized,
      "resetPassword token is expired or invalid"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    },
  });

  await db.session.deleteMany({
    where: {
      userId: user.id,
      NOT: {
        id: req.user.sessionId,
      },
    },
  });

  res
    .status(200)
    .json(new ApiResponse(ResponseStatus.Success, null, "Password reset done"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    throw new CustomError(
      ResponseStatus.Unauthorized,
      "sessionId in cookies is missing"
    );
  }
  const currRefreshToken = req.cookies?.sessionId;
  if (!currRefreshToken) {
    throw new CustomError(
      ResponseStatus.Unauthorized,
      "Refresh token is missing"
    );
  }

  let jwtVerified;
  try {
    jwtVerified = jwt.verify(currRefreshToken, envConfig.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new CustomError(400, "Invalid refresh token");
  }
  const decoded = jwtVerified as DecodedUser;

  const currUser = await db.user.findUnique({
    where: {
      email: decoded.userName,
    },
  });
  if (!currUser) {
    throw new CustomError(400, "Decoded user doesnot exists");
  }

  const accessToken = await generateAccessToken(currUser, decoded.sessionId);
  const refreshToken = await generateRefreshToken(currUser, decoded.sessionId);

  await db.session.update({
    where: { id: decoded.sessionId },
    data: {
      refreshToken,
    },
  });

  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
    })
    .json(new ApiResponse(200, null, "Access token refreshed"));
});

const logoutAllSessions = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const sessionId = req.cookies.sessionId;

  const sessionData = await db.session.deleteMany({
    where: {
      userId: id,
      NOT: {
        id: sessionId,
      },
    },
  });

  res
    .status(ResponseStatus.Success)
    .json(
      new ApiResponse(
        ResponseStatus.Success,
        null,
        "logged from all other devices"
      )
    );
});

const logoutFromSessionId = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) throw new CustomError(400, "session Id doesnot exists");

  await db.session.delete({
    where: { id: sessionId },
  });

  res.status(200).json(new ApiResponse(200, null, "logged out from session"));
});

const getAllSessions = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const allActiveSessions = await db.session.findMany({
    where: {
      userId: id,
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        ResponseStatus.Success,
        allActiveSessions,
        "Sessions returned"
      )
    );
});

export {
  registerUser,
  verifyUser,
  logoutUser,
  loginUser,
  resendEmailVerification,
  forgetPasswrod,
  resetPassword,
  refreshAccessToken,
  logoutAllSessions,
  getAllSessions,
  logoutFromSessionId,
};
