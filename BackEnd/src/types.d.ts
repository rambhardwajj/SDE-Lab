import { PrismaClient } from "@prisma/client";
import {User} from "./generated/prisma/index"

export type DecodedUser = Pick<
  User,
  | "id"
  | "userName"
  | "role"
>;

declare global {
  var prisma: PrismaClient | undefined;
  namespace Express {
    interface Request {
      user: DecodedUser
    }
  }
}
