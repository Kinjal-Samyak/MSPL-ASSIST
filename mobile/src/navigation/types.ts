import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
};

/**
 * A plain native-stack today. When the Technician Console grows tab-worthy sections
 * (Dashboard / My Jobs / Profile as persistent tabs), a `@react-navigation/bottom-tabs`
 * navigator slots in here as the "Main" entry's screen component - the param list and the
 * Auth/Main split above it do not need to change.
 */
export type MainStackParamList = {
  Dashboard: undefined;
  MyJobs: undefined;
  /** Only identifiers cross the navigation boundary - the Job Workspace loads its own data
   * through JobDetailsRepository. jobNumber/linkedTicketId are passed only so the header can show
   * something meaningful before that fetch resolves; they are never treated as authoritative. */
  JobDetails: { jobId: string; jobNumber: string; linkedTicketId: string };
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
