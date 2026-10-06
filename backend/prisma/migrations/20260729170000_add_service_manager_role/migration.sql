-- Amendment 1 (Version 1.0): Service Manager role - inherits every Administrator permission
-- except deleting a ticket (enforced in application code, not the schema).
ALTER TYPE "Role" ADD VALUE 'SERVICE_MANAGER';
