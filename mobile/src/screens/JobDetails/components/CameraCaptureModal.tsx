import { useRef, useState } from 'react';
import { CameraView } from 'expo-camera';
import { File } from 'expo-file-system';
import { Check, RotateCcw, X } from 'lucide-react-native';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { palette } from '@/theme';
import type { RawCapturedPhoto } from '@/executors/attachmentExecutor';

export interface CameraCaptureModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onAccept: (photo: RawCapturedPhoto) => void;
}

/**
 * In-app camera (Part 5): a live preview, not a hand-off to the system camera app - the
 * Technician gets Take Photo / Retake / Accept / Cancel entirely within MSPL Assist. Only takes a
 * photo and returns it; it never calls the repository or executor directly (that happens once the
 * caller passes the accepted photo to `useAttachmentCapture`).
 */
export function CameraCaptureModal({ isOpen, onCancel, onAccept }: CameraCaptureModalProps) {
  const { theme } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleClose = () => {
    setCapturedUri(null);
    onCancel();
  };

  const handleShutterPress = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => setCapturedUri(null);

  const handleAccept = () => {
    if (!capturedUri) return;
    const fileName = capturedUri.split('/').pop() ?? `photo-${Date.now()}.jpg`;
    let fileSize = 0;
    try {
      fileSize = new File(capturedUri).size ?? 0;
    } catch {
      // Non-fatal - validation treats an unknown size as 0, which always passes the size check.
    }
    onAccept({ uri: capturedUri, mimeType: 'image/jpeg', fileName, fileSize });
    setCapturedUri(null);
  };

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: palette.black }]}>
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <CameraView ref={cameraRef} style={styles.preview} facing="back" />
        )}

        <View style={[styles.topBar, { paddingTop: theme.spacing['3xl'] }]}>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={12}
            style={styles.iconButton}
          >
            <X size={22} color={palette.white} />
          </Pressable>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: theme.spacing['3xl'], gap: theme.spacing.lg }]}>
          {capturedUri ? (
            <>
              <Pressable
                onPress={handleRetake}
                accessibilityRole="button"
                accessibilityLabel="Retake photo"
                style={[styles.secondaryButton, { borderColor: palette.white }]}
              >
                <RotateCcw size={18} color={palette.white} />
                <Typography variant="button" style={{ color: palette.white, marginLeft: 6 }}>
                  Retake
                </Typography>
              </Pressable>
              <Pressable
                onPress={handleAccept}
                accessibilityRole="button"
                accessibilityLabel="Accept photo"
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              >
                <Check size={18} color={theme.colors.onPrimary} />
                <Typography variant="button" color="onPrimary" style={{ marginLeft: 6 }}>
                  Accept
                </Typography>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => void handleShutterPress()}
              disabled={isCapturing}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              style={[styles.shutter, { opacity: isCapturing ? theme.opacity.disabled : theme.opacity.opaque }]}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.white,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
});
