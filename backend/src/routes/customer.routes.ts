import { Router } from "express";
import { LookupController } from "../controllers/lookup.controller";
import { CustomerModuleController } from "../controllers/customer-module.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new LookupController();
const customerModuleController = new CustomerModuleController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/", customerModuleController.getCustomers);
router.get("/search", controller.searchCustomers);
router.post("/", customerModuleController.createCustomer);
router.get("/:customerId/vehicles", controller.getCustomerVehicles);
router.get("/:customerId", customerModuleController.getCustomerById);
router.patch("/:customerId", customerModuleController.updateCustomer);
router.patch("/:customerId/deactivate", customerModuleController.deactivateCustomer);
router.get("/:customerId/timeline", customerModuleController.getTimeline);
router.get("/:customerId/rental-history", customerModuleController.getRentalHistory);
router.get("/:customerId/active-vehicles", customerModuleController.getActiveVehicles);
router.get("/:customerId/documents", customerModuleController.getDocuments);

export default router;
