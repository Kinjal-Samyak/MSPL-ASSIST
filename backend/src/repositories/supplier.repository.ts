import type { Prisma, PrismaClient, Supplier } from "@prisma/client";
import type { SupplierListQueryDto } from "../dto/procurement.dto";

export class SupplierRepository {
  constructor(private prisma: PrismaClient) {}

  private buildWhere(query: SupplierListQueryDto): Prisma.SupplierWhereInput {
    return {
      ...(query.active === undefined ? {} : { active: query.active }),
      ...(query.search
        ? {
            OR: [
              { supplierCode: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  async list(query: SupplierListQueryDto): Promise<{ items: Supplier[]; totalRecords: number }> {
    const where = this.buildWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, totalRecords };
  }

  findById(id: string) {
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  findByCode(supplierCode: string) {
    return this.prisma.supplier.findUnique({ where: { supplierCode } });
  }

  create(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data });
  }

  update(id: string, data: Prisma.SupplierUpdateInput) {
    return this.prisma.supplier.update({ where: { id }, data });
  }
}
