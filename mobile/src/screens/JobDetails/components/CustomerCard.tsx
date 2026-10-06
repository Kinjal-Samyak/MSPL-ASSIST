import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Typography } from '@/components';
import { useTheme } from '@/hooks';
import type { JobCustomerInfo } from '@/models';

export interface CustomerCardProps {
  customer: JobCustomerInfo;
}

function CustomerCardComponent({ customer }: CustomerCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <Typography variant="title">Customer Information</Typography>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <View style={styles.row}>
          <Typography variant="caption" color="textSecondary">
            Customer Name
          </Typography>
          <Typography variant="body">{customer.name}</Typography>
        </View>
        <View style={styles.row}>
          <Typography variant="caption" color="textSecondary">
            Registered Mobile
          </Typography>
          <Typography variant="body">{customer.registeredMobile}</Typography>
        </View>
        <View style={styles.row}>
          <Typography variant="caption" color="textSecondary">
            Hub
          </Typography>
          <Typography variant="body">{customer.hub ?? 'Not available'}</Typography>
        </View>
      </View>
    </Card>
  );
}

export const CustomerCard = memo(CustomerCardComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
