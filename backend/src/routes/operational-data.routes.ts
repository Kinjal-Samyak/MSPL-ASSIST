import { Router } from "express";
import { OperationalDataController } from "../controllers/operational-data.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new OperationalDataController();

router.get("/operational-data", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.getSettings);
router.put("/operational-data", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.updateSettings);
router.patch("/operational-data/draft", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.saveConfigurationDraft);
router.post("/operational-data/validate", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.validateSettings);
router.post("/operational-data/scan-folder", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.scanFolder);
router.post("/operational-data/load-worksheets", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.loadWorksheets);
router.post(
  "/operational-data/wizard/validate-workbooks",
  requireAccessToken,
  requireRoles(["ADMIN", "SERVICE_MANAGER"]),
  controller.validateWorkbookUrls
);
router.get("/operational-data/wizard/auth/url", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.getGraphAuthorizationUrl);
router.get("/operational-data/wizard/auth/status", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.getGraphAuthStatus);
router.get(
  "/operational-data/wizard/onedrive/drives",
  requireAccessToken,
  requireRoles(["ADMIN", "SERVICE_MANAGER"]),
  controller.listOneDriveDrives
);
router.get(
  "/operational-data/wizard/onedrive/items",
  requireAccessToken,
  requireRoles(["ADMIN", "SERVICE_MANAGER"]),
  controller.browseOneDriveItems
);
router.get("/operational-data/wizard/auth/callback", controller.handleGraphAuthorizationCallback);
router.post(
  "/operational-data/wizard/auth/exchange",
  requireAccessToken,
  requireRoles(["ADMIN", "SERVICE_MANAGER"]),
  controller.exchangeGraphAuthorizationCode
);
router.post("/operational-data/wizard/load-headers", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.loadWorkbookHeaders);
router.post(
  "/operational-data/wizard/detect-mappings",
  requireAccessToken,
  requireRoles(["ADMIN", "SERVICE_MANAGER"]),
  controller.detectMappingSuggestions
);
router.post("/operational-data/wizard/preview", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.previewConfiguration);
router.post(
  "/operational-data/wizard/configuration",
  requireAccessToken,
  requireRoles(["ADMIN", "SERVICE_MANAGER"]),
  controller.saveWizardConfiguration
);

export default router;
