import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chefcreators.app',
  appName: 'ChefCreators',
  webDir: 'apps/web/dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_chefcreators',
      iconColor: '#E85D3D'
    }
  }
};

export default config;
