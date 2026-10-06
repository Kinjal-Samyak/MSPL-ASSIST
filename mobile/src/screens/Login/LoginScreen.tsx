import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AlertCircle, Eye, EyeOff, Lock, Phone } from 'lucide-react-native';
import { Button, Card, Input, Screen, Typography } from '@/components';
import { useLogin, useTheme } from '@/hooks';
import { getAppVersion } from '@/utils';

/**
 * Layout mirrors the web app's LoginPage exactly (frontend/src/pages/LoginPage.tsx): a small
 * logo-mark-plus-wordmark row above a Card, the Card holding the "Sign in" heading and the form.
 * Only the fields differ (mobile number instead of email, matching the backend's actual login
 * contract) - the visual language is the same one used everywhere else in MSPL Assist.
 */
export function LoginScreen() {
  const { theme } = useTheme();
  const {
    mobileNumber,
    password,
    setMobileNumber,
    setPassword,
    mobileNumberError,
    passwordError,
    formError,
    isSubmitting,
    isValid,
    submit,
  } = useLogin();
  const passwordRef = useRef<TextInput>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Screen scrollable>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={[styles.logoRow, { marginBottom: theme.spacing['3xl'] }]}>
            <View
              style={[styles.logoMark, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
              accessibilityLabel="MSPL Assist logo"
            >
              <Typography variant="label" color="onPrimary">
                MA
              </Typography>
            </View>
            <Typography variant="h3">MSPL Assist</Typography>
          </View>

          <Card>
            <Typography variant="h2" style={styles.heading}>
              Sign in to your account
            </Typography>

            {formError ? (
              <Card
                padded
                elevation="none"
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: theme.colors.dangerMuted,
                    borderColor: theme.colors.danger,
                    marginBottom: theme.spacing.lg,
                  },
                ]}
                accessibilityRole="alert"
              >
                <View style={styles.errorContent}>
                  <AlertCircle size={16} color={theme.colors.danger} />
                  <Typography variant="body" color="danger" style={styles.errorText}>
                    {formError}
                  </Typography>
                </View>
              </Card>
            ) : null}

            <View style={{ gap: theme.spacing.lg }}>
              <Input
                label="Mobile Number"
                placeholder="10-digit mobile number"
                value={mobileNumber}
                onChangeText={setMobileNumber}
                error={mobileNumberError ?? undefined}
                leftElement={<Phone size={16} color={theme.colors.textSecondary} />}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={13}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Mobile number"
                accessibilityHint="Enter your registered 10-digit mobile number"
              />

              <Input
                ref={passwordRef}
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                error={passwordError ?? undefined}
                secureTextEntry={!isPasswordVisible}
                leftElement={<Lock size={16} color={theme.colors.textSecondary} />}
                rightElement={
                  <Pressable
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                    hitSlop={14}
                  >
                    {isPasswordVisible ? (
                      <EyeOff size={16} color={theme.colors.textSecondary} />
                    ) : (
                      <Eye size={16} color={theme.colors.textSecondary} />
                    )}
                  </Pressable>
                }
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                accessibilityLabel="Password"
                accessibilityHint="Enter your account password"
              />

              <Button
                label="Log In"
                onPress={() => void submit()}
                loading={isSubmitting}
                disabled={!isValid || isSubmitting}
                fullWidth
                accessibilityLabel="Log in"
                accessibilityHint="Signs in with the mobile number and password entered above"
              />

              <Button
                label="Forgot Password?"
                variant="ghost"
                disabled
                fullWidth
                accessibilityLabel="Forgot password"
                accessibilityHint="Password recovery is not available yet"
              />
            </View>
          </Card>

          <View style={[styles.footer, { marginTop: theme.spacing['3xl'] }]}>
            <Typography variant="caption" color="textSecondary">
              MSPL Assist &middot; v{getAppVersion()}
            </Typography>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoMark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    marginBottom: 24,
  },
  errorCard: {
    borderWidth: 1,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
  },
});
