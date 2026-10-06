import bcrypt from "bcryptjs";
import { config } from "../config";
import type { BootstrapSetupResponseDto } from "../dto/setup.dto";
import { ConflictError, ForbiddenError } from "../errors";
import { SetupRepository } from "../repositories/setup.repository";
import { validateBootstrapSetupPayload } from "../validators/setup.validator";

export class SetupService {
  constructor(private readonly repository: SetupRepository = new SetupRepository()) {}

  async bootstrap(payloadInput: unknown): Promise<BootstrapSetupResponseDto> {
    const payload = validateBootstrapSetupPayload(payloadInput);

    const userCount = await this.repository.countUsers();
    if (userCount > 0) {
      throw new ForbiddenError("System already initialized.");
    }

    const existingByEmail = await this.repository.findUserByEmail(payload.email);
    if (existingByEmail) {
      throw new ConflictError("A user with the same email already exists.");
    }

    const passwordHash = await bcrypt.hash(payload.password, config.auth.bcryptSaltRounds);
    const created = await this.repository.createInitialAdmin({
      companyName: payload.companyName,
      adminName: payload.adminName,
      email: payload.email,
      passwordHash,
    });

    return {
      status: "SUCCESS",
      message: "System initialized successfully.",
      adminUserId: created.userId,
      initializedAt: created.initializedAt.toISOString(),
    };
  }
}

