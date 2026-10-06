ALTER TABLE "VehicleModel" ADD COLUMN "vehicleType" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "vehicleTypeSnapshot" TEXT;
UPDATE "VehicleModel" SET "vehicleType" = 'Micro Mobility' WHERE "modelCode" IN ('HUM24SMT+', 'HUMSMT+', 'KIVO24SMT+', 'KIVOEASYSMT+', 'KIVOEASYSMT+MR', 'KIVOSMT+', 'URBNSMT+', 'URBNSTD');
UPDATE "VehicleModel" SET "vehicleType" = 'High Speed' WHERE "modelCode" IN ('M7', 'MVF7');
