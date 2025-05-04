import {State, Device} from 'react-native-ble-plx';

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
