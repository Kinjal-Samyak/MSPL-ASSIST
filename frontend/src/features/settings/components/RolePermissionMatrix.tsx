import { Card } from '@/components/ui';
import type { AdminPermissionItem, AdminRoleItem } from '@/services/adminService';

interface RolePermissionMatrixProps {
  roles: AdminRoleItem[];
  permissions: AdminPermissionItem[];
}

export function RolePermissionMatrix({ roles, permissions }: RolePermissionMatrixProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Roles & Permissions
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-2 py-2">Permission</th>
              {roles.map((role) => (
                <th key={role.role} className="px-2 py-2">
                  {role.role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.code} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-2 py-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{permission.code}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {permission.description}
                  </p>
                </td>
                {roles.map((role) => (
                  <td
                    key={`${permission.code}-${role.role}`}
                    className="px-2 py-2 text-center text-gray-700 dark:text-gray-300"
                  >
                    {permission.roles.includes(role.role) ? '✓' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
