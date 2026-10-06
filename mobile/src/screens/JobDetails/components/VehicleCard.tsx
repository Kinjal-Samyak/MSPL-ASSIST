import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Typography } from '@/components';
import { useTheme } from '@/hooks';
import type { JobVehicleInfo } from '@/models';

export interface VehicleCardProps {
  vehicle: JobVehicleInfo;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </View>
  );
}

/** Registration Number only applies to High Speed vehicles - and the current backend contract
 * doesn't populate it yet regardless (see jobDetails.models.ts), so it always reads "Not available". */
function VehicleCardComponent({ vehicle }: VehicleCardProps) {
  const { theme } = useTheme();
  const isHighSpeed = vehicle.vehicleType?.toLowerCase() === 'high speed';

  return (
    <Card>
      <Typography variant="title">Vehicle Information</Typography>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <Row label="MV Track Number" value={vehicle.mvTrackNumber ?? 'Not available'} />
        <Row label="Vehicle Model" value={vehicle.vehicleModel ?? 'Not available'} />
        <Row label="Vehicle Type" value={vehicle.vehicleType ?? 'Not available'} />
        {isHighSpeed ? <Row label="Registration Number" value={vehicle.registrationNumber ?? 'Not available'} /> : null}
      </View>
    </Card>
  );
}

export const VehicleCard = memo(VehicleCardComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
