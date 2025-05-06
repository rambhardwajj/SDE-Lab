import { PrismaClient } from "@prisma/client";
import {User} from "./generated/prisma/index"

export type DecodedUser = Pick<
  User,
  "id" | "userName" | "role"
> & {
  sessionId: string; // ✅ Add this to support per-session operations
};

declare global {
  var prisma: PrismaClient | undefined;
  namespace Express {
    interface Request {
      user: DecodedUser
    }
  }
}
