import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Card, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { getRideabilityBadgeVariant, getRideabilityLabel } from '@/utils';
import type { JobIssueInfo } from '@/models';

export interface IssueDetailsCardProps {
  issue: JobIssueInfo;
}

function IssueDetailsCardComponent({ issue }: IssueDetailsCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <View style={styles.headerRow}>
        <Typography variant="title">Issue Details</Typography>
        {issue.rideabilityStatus ? (
          <Badge label={getRideabilityLabel(issue.rideabilityStatus)} variant={getRideabilityBadgeVariant(issue.rideabilityStatus)} />
        ) : null}
      </View>

      <View style={{ marginTop: theme.spacing.md }}>
        <Typography variant="caption" color="textSecondary">
          Primary Issue Category
        </Typography>
        <Typography variant="body" style={{ marginTop: 2 }}>
          {issue.issueCategory}
        </Typography>
      </View>

      <View style={{ marginTop: theme.spacing.md }}>
        <Typography variant="caption" color="textSecondary">
          Issue Subcategories
        </Typography>
        <View style={[styles.chipRow, { gap: theme.spacing.xs, marginTop: theme.spacing.xs }]}>
          {issue.issueSubcategories.length > 0 ? (
            issue.issueSubcategories.map((subcategory) => <Badge key={subcategory} label={subcategory} variant="neutral" />)
          ) : (
            <Typography variant="body" color="textSecondary">
              Not available
            </Typography>
          )}
        </View>
      </View>
    </Card>
  );
}

export const IssueDetailsCard = memo(IssueDetailsCardComponent);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
