import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreatePartCategoryDto, CreatePartDto, CreatePartSubcategoryDto, PartListQueryDto, UpdatePartCategoryDto } from "../dto/parts.dto";

type PartsPrisma = PrismaClient | Prisma.TransactionClient;
export class PartsRepository {
  constructor(private readonly prisma: PartsPrisma) {}
  listCategories() { return this.prisma.partCategory.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }); }
  createCategory(data: CreatePartCategoryDto) { return this.prisma.partCategory.create({ data: { ...data, displayOrder: data.displayOrder ?? 0 } }); }
  createSubcategory(data: CreatePartSubcategoryDto) { return this.prisma.partSubcategory.create({ data }); }
  findCategory(id: string) { return this.prisma.partCategory.findUnique({ where: { id } }); }
  findCategoryByName(name: string) { return this.prisma.partCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" }, active: true } }); }
  /** Used to auto-create parts from an Inventory import that don't yet exist in the Catalog - never manually assigned. */
  async findOrCreateGeneralCategory() {
    const existing = await this.findCategoryByName("General");
    if (existing) return existing;
    return this.prisma.partCategory.create({ data: { name: "General", description: "Auto-created for parts first seen via Inventory import.", displayOrder: 0, active: true } });
  }
  findVehicleModelByCode(modelCode: string) { return this.prisma.vehicleModel.findFirst({ where: { modelCode: { equals: modelCode, mode: "insensitive" }, active: true } }); }
  findSubcategory(id: string) { return this.prisma.partSubcategory.findUnique({ where: { id } }); }
  createPart(data: CreatePartDto) { const { compatibleModels, ...part } = data; return this.prisma.part.create({ data: { ...part, compatibilities: { create: compatibleModels } }, include: { category: true, subcategory: true, compatibilities: true } }); }
  findPartByCode(partCode: string) { return this.prisma.part.findUnique({ where: { partCode } }); }
  incrementAvailableQuantity(partCode: string, amount: number) { return this.prisma.part.update({ where: { partCode }, data: { availableQuantity: { increment: amount } } }); }
  updatePart(id: string, data: CreatePartDto) { const { compatibleModels, ...part } = data; return this.prisma.part.update({ where: { id }, data: { ...part, compatibilities: { deleteMany: {}, create: compatibleModels } }, include: { category: true, subcategory: true, compatibilities: true } }); }
  findPart(id: string) { return this.prisma.part.findUnique({ where: { id } }); }
  updatePartCategoryAndCompatibility(id: string, data: UpdatePartCategoryDto) { return this.prisma.part.update({ where: { id }, data: { categoryId: data.categoryId, compatibilities: { deleteMany: {}, create: data.compatibleModels } }, include: { category: true, subcategory: true, compatibilities: true } }); }
  listParts(query: PartListQueryDto) { return this.prisma.part.findMany({ where: { ...(query.active === undefined ? {} : { active: query.active }), ...(query.categoryId ? { categoryId: query.categoryId } : {}), ...(query.search ? { OR: [{ partCode: { contains: query.search, mode: "insensitive" } }, { partName: { contains: query.search, mode: "insensitive" } }] } : {}) }, include: { category: true, subcategory: true, compatibilities: true }, orderBy: { partCode: "asc" } }); }
}
