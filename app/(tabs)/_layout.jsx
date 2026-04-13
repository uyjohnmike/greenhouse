// _layout.jsx - REMOVE THE TAB BAR
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
       
        tabBarStyle: { display: 'none' },
      }}>
    
    </Tabs>
  );
}