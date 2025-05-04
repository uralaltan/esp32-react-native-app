import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/homeScreen';
import BleScreen from '../screens/bleScreen';
import {RootStackParamList} from '../types/type.d';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        headerShown: false,
      },
    },
  },
});

export default RootStack;
