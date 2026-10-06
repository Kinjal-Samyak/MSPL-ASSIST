/**
 * Business-language alias. Persistence and the public API retain their legacy
 * Customer names for backward compatibility; new business code should use RiderService.
 */
export { CustomerService as RiderService } from "./customer.service";
