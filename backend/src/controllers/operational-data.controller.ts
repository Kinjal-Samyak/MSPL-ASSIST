import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  BrowseOneDriveItemsResponseDto,
  DetectMappingSuggestionsResponseDto,
  GraphAuthStatusResponseDto,
  GraphAuthUrlResponseDto,
  LoadWorkbookHeadersResponseDto,
  OneDriveDriveDto,
  OperationalDataSettingsDto,
  OperationalFolderScanResponseDto,
  PreviewOperationalConfigurationResponseDto,
  ValidateOperationalDataResponseDto,
  ValidateWorkbookUrlsResponseDto,
  WorkbookWorksheetsResponseDto,
} from "../dto/operational-data.dto";
import { operationalDataService, type OperationalDataService } from "../services/operational-data.service";
import { logger } from "../utils/logger";

export class OperationalDataController {
  private static readonly GRAPH_AUTH_SUCCESS_REDIRECT = "http://localhost:5173/settings?graphAuth=success";
  private static readonly GRAPH_AUTH_FAILURE_REDIRECT = "http://localhost:5173/settings?graphAuth=failed";

  constructor(private readonly service: OperationalDataService = operationalDataService) {}

  getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getSettings();
      const response: ApiResponse<OperationalDataSettingsDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.saveSettings(req.body);
      const response: ApiResponse<OperationalDataSettingsDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  saveConfigurationDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.saveConfigurationDraft(req.body);
      const response: ApiResponse<OperationalDataSettingsDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  validateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.validateConfiguration(req.body);
      const response: ApiResponse<ValidateOperationalDataResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  scanFolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.scanFolder(req.body);
      const response: ApiResponse<OperationalFolderScanResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  loadWorksheets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.loadWorksheets(req.body);
      const response: ApiResponse<WorkbookWorksheetsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  validateWorkbookUrls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.validateWorkbookUrls(req.body);
      const response: ApiResponse<ValidateWorkbookUrlsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  loadWorkbookHeaders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.loadWorkbookHeaders(req.body);
      const response: ApiResponse<LoadWorkbookHeadersResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  detectMappingSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.detectMappingSuggestions(req.body);
      const response: ApiResponse<DetectMappingSuggestionsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  previewConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.previewConfiguration(req.body);
      const response: ApiResponse<PreviewOperationalConfigurationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  saveWizardConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.saveWizardConfiguration(req.body);
      const response: ApiResponse<OperationalDataSettingsDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getGraphAuthorizationUrl = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = this.service.getGraphAuthorizationUrl();
      const response: ApiResponse<GraphAuthUrlResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  exchangeGraphAuthorizationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.exchangeGraphAuthorizationCode(req.body);
      const response: ApiResponse<GraphAuthStatusResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  handleGraphAuthorizationCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.service.processGraphAuthorizationCallback(req.query);
      res.redirect(302, OperationalDataController.GRAPH_AUTH_SUCCESS_REDIRECT);
    } catch (error) {
      const details =
        error instanceof Error && "details" in error && typeof (error as { details?: unknown }).details === "object"
          ? ((error as { details?: Record<string, unknown> }).details ?? {})
          : {};
      logger.error({
        scope: "graph-auth",
        event: "Authorization Callback Failed",
        queryError: typeof req.query.error === "string" ? req.query.error : null,
        queryErrorDescription:
          typeof req.query.error_description === "string" ? req.query.error_description : null,
        message: error instanceof Error ? error.message : "Unknown graph auth callback error.",
        microsoftErrorCode: typeof details.microsoftErrorCode === "string" ? details.microsoftErrorCode : null,
        httpStatus: typeof details.httpStatus === "number" ? details.httpStatus : null,
        responseBody: "responseBody" in details ? details.responseBody : null,
        axiosErrorMessage: typeof details.axiosErrorMessage === "string" ? details.axiosErrorMessage : null,
        stackTrace: error instanceof Error ? error.stack ?? null : null,
      });
      res.redirect(302, OperationalDataController.GRAPH_AUTH_FAILURE_REDIRECT);
    }
  };

  getGraphAuthStatus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getGraphAuthStatus();
      const response: ApiResponse<GraphAuthStatusResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  listOneDriveDrives = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listOneDriveDrives();
      const response: ApiResponse<OneDriveDriveDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  browseOneDriveItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.browseOneDriveItems(req.query);
      const response: ApiResponse<BrowseOneDriveItemsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
