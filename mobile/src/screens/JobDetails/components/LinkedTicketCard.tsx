import { memo } from 'react';
import { Link2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Card, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { formatDateTime } from '@/utils';
import type { LinkedTicketReference } from '@/models';

export interface LinkedTicketCardProps {
  ticket: LinkedTicketReference;
}

/** A small, deliberately minimal reference card - the Technician works on the Job, not the
 * Ticket; this exists only for traceability back to the customer-facing record. */
function LinkedTicketCardComponent({ ticket }: LinkedTicketCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <View style={styles.headerRow}>
        <Link2 size={16} color={theme.colors.textSecondary} />
        <Typography variant="label" color="textSecondary" style={{ marginLeft: 6 }}>
          LINKED TICKET
        </Typography>
      </View>
      <Typography variant="title" style={{ marginTop: theme.spacing.xs }}>
        {ticket.ticketNumber}
      </Typography>
      <View style={[styles.row, { marginTop: theme.spacing.md }]}>
        <Typography variant="caption" color="textSecondary">
          Ticket Created
        </Typography>
        <Typography variant="body">{formatDateTime(ticket.createdAt)}</Typography>
      </View>
      <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
        <Typography variant="caption" color="textSecondary">
          Service Request Type
        </Typography>
        <Typography variant="body">{ticket.serviceRequestType}</Typography>
      </View>
    </Card>
  );
}

export const LinkedTicketCard = memo(LinkedTicketCardComponent);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
