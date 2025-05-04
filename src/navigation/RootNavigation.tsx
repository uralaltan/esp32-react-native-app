import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/homeScreen';
import BleScreen from '../screens/bleScreen';
import { RootStackParamList } from '../types/type.d'; // Import the param list type

const Stack = createNativeStackNavigator<RootStackParamList>(); // Use the param list type

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        headerShown: false,
      },
    },
    Ble: {
      screen: BleScreen,
      options: {
        headerShown: false, // Keep header hidden for now, can be customized later
      },
    },
  },
});

export default RootStack;
