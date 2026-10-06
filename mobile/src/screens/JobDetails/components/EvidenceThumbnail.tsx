import { memo, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Typography } from '@/components';
import { useTheme } from '@/hooks';
import { formatDateTime } from '@/utils';
import type { Attachment } from '@/models';
import { UploadStatusBadge } from './UploadStatusBadge';

export interface EvidenceThumbnailProps {
  attachment: Attachment;
  onPress: (attachment: Attachment) => void;
}

/** A single grid tile: thumbnail, capture date, upload status. Falls back to a placeholder icon
 * if the thumbnail fails to load (Part 12: "Image load failure"). */
function EvidenceThumbnailComponent({ attachment, onPress }: EvidenceThumbnailProps) {
  const { theme } = useTheme();
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <Pressable
      onPress={() => onPress(attachment)}
      accessibilityRole="button"
      accessibilityLabel={`Preview photo captured ${formatDateTime(attachment.capturedAt)}, ${attachment.status.toLowerCase()}`}
      style={({ pressed }) => [styles.container, { opacity: pressed ? theme.opacity.pressed : theme.opacity.opaque }]}
    >
      <View
        style={[
          styles.imageWrapper,
          { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.lg },
        ]}
      >
        {attachment.thumbnailUrl && !loadFailed ? (
          <Image
            source={{ uri: attachment.thumbnailUrl }}
            style={[styles.image, { borderRadius: theme.radius.lg }]}
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <ImageIcon size={24} color={theme.colors.textSecondary} />
        )}
      </View>
      <View style={{ marginTop: theme.spacing.xs, gap: 4 }}>
        <UploadStatusBadge status={attachment.status} uploadProgress={attachment.uploadProgress} />
        <Typography variant="caption" color="textSecondary">
          {formatDateTime(attachment.capturedAt)}
        </Typography>
      </View>
    </Pressable>
  );
}

export const EvidenceThumbnail = memo(EvidenceThumbnailComponent);

const styles = StyleSheet.create({
  container: {
    width: 104,
  },
  imageWrapper: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
