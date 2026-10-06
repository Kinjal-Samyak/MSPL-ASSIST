import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { PermissionController } from "../controllers/permission.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const controller = new AdminController();
const permissionController = new PermissionController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]));

router.get("/role-permissions", permissionController.getMatrix);
router.patch("/role-permissions", requirePermission("ADMIN_ROLES_PERMISSIONS_MANAGE"), permissionController.updateMatrix);

router.get("/dashboard", controller.getDashboard);
router.get("/users", controller.getUsers);
router.post("/users", controller.createUser);
router.get("/users/export", controller.exportUsers);
router.get("/users/:userId", controller.getUserById);
router.patch("/users/:userId", controller.updateUser);
router.patch("/users/:userId/activate", controller.activateUser);
router.patch("/users/:userId/deactivate", controller.deactivateUser);
router.delete("/users/:userId", controller.deleteUser);
router.post("/users/:userId/reset-password", controller.resetUserPassword);
router.patch("/users/:userId/lock", controller.lockUser);
router.patch("/users/:userId/unlock", controller.unlockUser);
router.get("/roles", controller.getRoles);
router.get("/permissions", controller.getPermissions);
router.get("/hubs", controller.getHubs);
router.post("/hubs", controller.createHub);
router.patch("/hubs/:hubId", controller.updateHub);
router.get("/settings", controller.getSettings);
router.patch("/settings", controller.updateSettings);

export default router;
