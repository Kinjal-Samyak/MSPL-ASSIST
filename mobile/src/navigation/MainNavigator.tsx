import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen, JobDetailsScreen, MyJobsScreen, ProfileScreen, SettingsScreen } from '@/screens';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

/** Authenticated area. See the comment on `MainStackParamList` for how this becomes tab-based later. */
export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="MyJobs" component={MyJobsScreen} />
      <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
