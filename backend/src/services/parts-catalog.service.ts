import { ConflictError, NotFoundError } from "../errors";
import { prismaClient } from "../database";
import type { CreatePartCategoryDto, CreatePartDto, CreatePartSubcategoryDto, PartCategoryResponseDto, PartListQueryDto, PartResponseDto, UpdatePartCategoryDto } from "../dto/parts.dto";
import { PartsRepository } from "../repositories/parts.repository";

export class PartsCatalogService {
  constructor(private readonly repository = new PartsRepository(prismaClient)) {}
  async listCategories(): Promise<PartCategoryResponseDto[]> { return (await this.repository.listCategories()).map((item) => ({ id: item.id, name: item.name, description: item.description, displayOrder: item.displayOrder, active: item.active })); }
  async createCategory(input: CreatePartCategoryDto): Promise<PartCategoryResponseDto> {
    try { const item = await this.repository.createCategory(input); return { id: item.id, name: item.name, description: item.description, displayOrder: item.displayOrder, active: item.active }; }
    catch (error) { if (this.isUniqueError(error)) throw new ConflictError("A part category with this name already exists."); throw error; }
  }
  async createSubcategory(input: CreatePartSubcategoryDto): Promise<{ id: string; name: string; categoryId: string }> {
    if (!await this.repository.findCategory(input.categoryId)) throw new NotFoundError("Part category was not found.");
    try { const item = await this.repository.createSubcategory(input); return { id: item.id, name: item.name, categoryId: item.categoryId }; }
    catch (error) { if (this.isUniqueError(error)) throw new ConflictError("A part subcategory with this name already exists in the category."); throw error; }
  }
  async createPart(input: CreatePartDto): Promise<PartResponseDto> {
    if (!await this.repository.findCategory(input.categoryId)) throw new NotFoundError("Part category was not found.");
    if (input.subcategoryId) { const subcategory = await this.repository.findSubcategory(input.subcategoryId); if (!subcategory || subcategory.categoryId !== input.categoryId) throw new NotFoundError("Part subcategory was not found in the selected category."); }
    try { return this.map(await this.repository.createPart(input)); }
    catch (error) { if (this.isUniqueError(error)) throw new ConflictError("A part with this Part Code already exists."); throw error; }
  }
  async listParts(query: PartListQueryDto): Promise<PartResponseDto[]> { return (await this.repository.listParts(query)).map((item) => this.map(item)); }
  async updatePartCategory(id: string, input: UpdatePartCategoryDto): Promise<PartResponseDto> {
    if (!await this.repository.findPart(id)) throw new NotFoundError("Part was not found.");
    if (!await this.repository.findCategory(input.categoryId)) throw new NotFoundError("Part category was not found.");
    return this.map(await this.repository.updatePartCategoryAndCompatibility(id, input));
  }
  private map(item: any): PartResponseDto { return { id: item.id, partCode: item.partCode, partName: item.partName, description: item.description, category: { id: item.category.id, name: item.category.name, description: item.category.description, displayOrder: item.category.displayOrder, active: item.category.active }, subcategory: item.subcategory ? { id: item.subcategory.id, name: item.subcategory.name } : null, unitOfMeasure: item.unitOfMeasure, partCost: item.partCost.toString(), warrantyEligible: item.warrantyEligible, consumable: item.consumable, minimumStock: item.minimumStock, reorderLevel: item.reorderLevel, maximumStock: item.maximumStock, active: item.active, remarks: item.remarks, compatibleModels: item.compatibilities.map((model: any) => ({ modelCode: model.modelCode, modelName: model.modelName })), availableQuantity: item.availableQuantity }; }
  private isUniqueError(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002"; }
}
