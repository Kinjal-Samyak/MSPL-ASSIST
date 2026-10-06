import { useState } from 'react';
import { Archive, CircleGauge, PackageCheck, TrendingUp, Wrench } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Card, StatCard, type StatCardTone } from '@/components/ui';

interface VehicleDashboardProps {
  totalVehicles: number;
  availableVehicles: number;
  deployedVehicles: number;
  maintenanceVehicles: number;
  workshopVehicles: number;
  reservedVehicles: number;
  inactiveVehicles: number;
  revenueFleet: number;
  readyForDeployment: number;
  downFleet: number;
  inventoryHold: number;
  fleetUtilizationPercent: number;
  availabilityPercent: number;
  averageDowntimeHours: number;
  mttrHours: number;
  vehiclesReadyToday: number;
  waitingForSpare: number;
  repairInProgress: number;
  qualityCheck: number;
  vehiclesAgingOver72Hours: number;
  readyForDeploymentBreakdown: {
    fromInventory: number;
    fromService: number;
    deployableToday: number;
  };
  downFleetBreakdown: {
    inspection: number;
    waitingForSpare: number;
    workInProgress: number;
    readyForDeployment: number;
  };
  fleetHealth: { score: number; label: 'Excellent' | 'Good' | 'Attention' | 'Critical' };
  inventoryHoldBreakdown: {
    registrationPending: number;
    insurancePending: number;
    pdiPending: number;
  };
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-800">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <span className="font-semibold text-gray-950 dark:text-gray-50">{value}</span>
    </div>
  );
}

const VEHICLE_TONE_MAP: Record<'slate' | 'blue' | 'emerald' | 'rose' | 'amber', StatCardTone> = {
  slate: 'slate',
  blue: 'blue',
  emerald: 'emerald',
  rose: 'rose',
  amber: 'amber',
};

export function VehicleDashboard(props: VehicleDashboardProps) {
  const [openBreakdown, setOpenBreakdown] = useState<'ready' | 'down' | 'hold' | null>(null);
  const healthTone =
    props.fleetHealth.score >= 85
      ? 'text-success dark:text-emerald-300'
      : props.fleetHealth.score >= 70
        ? 'text-primary dark:text-blue-300'
        : 'text-warning dark:text-amber-300';

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Total Fleet"
          value={props.totalVehicles}
          icon={PackageCheck}
          tone={VEHICLE_TONE_MAP.slate}
        />
        <StatCard
          label="Revenue Fleet"
          value={props.revenueFleet}
          icon={TrendingUp}
          tone={VEHICLE_TONE_MAP.blue}
        />
        <StatCard
          label="Ready for Deployment"
          value={props.readyForDeployment}
          icon={PackageCheck}
          tone={VEHICLE_TONE_MAP.emerald}
          sublabel="View breakdown"
          onClick={() => setOpenBreakdown('ready')}
        />
        <StatCard
          label="Inventory Hold"
          value={props.inventoryHold}
          icon={Archive}
          tone={VEHICLE_TONE_MAP.amber}
          sublabel="View breakdown"
          onClick={() => setOpenBreakdown('hold')}
        />
        <StatCard
          label="Down Fleet"
          value={props.downFleet}
          icon={Wrench}
          tone={VEHICLE_TONE_MAP.rose}
          sublabel="View breakdown"
          onClick={() => setOpenBreakdown('down')}
        />
        <StatCard
          label="Fleet Utilization"
          value={`${props.fleetUtilizationPercent}%`}
          icon={CircleGauge}
          tone={VEHICLE_TONE_MAP.blue}
        />
      </div>

      <Card
        padding="sm"
        className="flex items-center justify-between rounded-xl border-gray-200/80 dark:border-gray-800/80"
      >
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Fleet Health</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Utilization, downtime, down fleet and overdue repairs
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-semibold ${healthTone}`}>{props.fleetHealth.score} / 100</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {props.fleetHealth.label}
          </p>
        </div>
      </Card>

      <Modal
        isOpen={openBreakdown === 'ready'}
        onClose={() => setOpenBreakdown(null)}
        title="Ready for Deployment"
        size="sm"
      >
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Vehicles immediately available to generate revenue.
        </p>
        <BreakdownRow
          label="From Inventory"
          value={props.readyForDeploymentBreakdown.fromInventory}
        />
        <BreakdownRow label="From Service" value={props.readyForDeploymentBreakdown.fromService} />
        <BreakdownRow
          label="Deployable Today"
          value={props.readyForDeploymentBreakdown.deployableToday}
        />
      </Modal>
      <Modal
        isOpen={openBreakdown === 'down'}
        onClose={() => setOpenBreakdown(null)}
        title="Down Fleet"
        size="sm"
      >
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Vehicles unavailable and not generating revenue.
        </p>
        <BreakdownRow label="Inspection" value={props.downFleetBreakdown.inspection} />
        <BreakdownRow label="Waiting for Spare" value={props.downFleetBreakdown.waitingForSpare} />
        <BreakdownRow label="Work In Progress" value={props.downFleetBreakdown.workInProgress} />
        <BreakdownRow
          label="Ready for Deployment"
          value={props.downFleetBreakdown.readyForDeployment}
        />
      </Modal>
      <Modal
        isOpen={openBreakdown === 'hold'}
        onClose={() => setOpenBreakdown(null)}
        title="Inventory Hold"
        size="sm"
      >
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Vehicles not yet legally or operationally ready for first deployment.
        </p>
        <BreakdownRow
          label="Registration Pending"
          value={props.inventoryHoldBreakdown.registrationPending}
        />
        <BreakdownRow
          label="Insurance Pending"
          value={props.inventoryHoldBreakdown.insurancePending}
        />
        <BreakdownRow label="PDI Pending" value={props.inventoryHoldBreakdown.pdiPending} />
      </Modal>
    </section>
  );
}
