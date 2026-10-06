import { PrismaOperationalDataSource } from "../../datasources/prisma-operational-data.datasource";

describe("PrismaOperationalDataSource technician lookup", () => {
  it("returns active technicians who have not yet been assigned a ticket", async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: "technician-1", name: "Technician One", mobile: "9000000002", tickets: [] },
        ]),
      },
    } as any;
    const source = new PrismaOperationalDataSource(prisma);

    await expect(source.getLookupTechnicians("Hub 1")).resolves.toEqual([
      { id: "technician-1", name: "Technician One", mobile: "9000000002", tickets: [] },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: "TECHNICIAN", active: true },
    }));
  });
});
