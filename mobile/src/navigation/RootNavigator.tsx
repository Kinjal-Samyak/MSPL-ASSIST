import { NavigationContainer } from '@react-navigation/native';
import { RouteGuard } from './RouteGuard';

export function RootNavigator() {
  return (
    <NavigationContainer>
      <RouteGuard />
    </NavigationContainer>
  );
}
