import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var prismaClient: PrismaClient | undefined;
}

const client = global.prismaClient || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaClient = client;
}

export const prismaClient = client;
