import {State, Device} from 'react-native-ble-plx';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

export interface BleObserver {
  onStarted?: (started: boolean) => void;
  onStateChanged?: (state: State) => void;
  onDeviceDetected?: (device: Device) => void;
  onError?: (error: any) => void;
  onDeviceConnected?: (device: Device) => void;
  onDeviceDisconnected?: (device: Device | null, error?: any) => void;
  onConnectionAttemptStatus?: (isConnecting: boolean) => void;
  onDataSent?: (success: boolean, error?: any) => void;
}

export type RootStackParamList = {
  Home: undefined;
  Ble: {
    device: Device;
    sendDataFunction?: (dataString: string) => Promise<void>;
  };
};

export type HomeScreenNavigationProp = NativeStackScreenProps<
  RootStackParamList,
  'Home'
>['navigation'];

export type BleScreenRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'Ble'
>['route'];

export type BleScreenNavigationProp = NativeStackScreenProps<
  RootStackParamList,
  'Ble'
>['navigation'];

export interface SixAxisData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

export interface IMUDataRow {
  ax: string;
  ay: string;
  az: string;
  gx: string;
  gy: string;
  gz: string;
  classification: number;
}

export interface IMURecording {
  axData: number[];
  ayData: number[];
  azData: number[];
  gxData: number[];
  gyData: number[];
  gzData: number[];
  isFall: number;
}
