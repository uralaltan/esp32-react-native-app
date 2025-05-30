import {useState, useEffect, useRef, useCallback} from 'react';
import {
  BleManager,
  State,
  Device,
  Subscription,
  LogLevel,
} from 'react-native-ble-plx';
import {Buffer} from 'buffer';
import {BleObserver} from '../types/type.d';
import Constants from '../constants';

const {SERVICE_UUID, CHARACTERISTIC_UUID} = Constants.bleConstants;

interface SixAxisData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

export const useBleManager = () => {
  const bleManager = useRef(new BleManager()).current;
  bleManager.setLogLevel(LogLevel.Verbose);
  const [bleState, setBleState] = useState<State>(State.Unknown);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  const observerRef = useRef<BleObserver>({});
  const disconnectSubscriptionRef = useRef<Subscription | null>(null);
  const stateSubscriptionRef = useRef<Subscription | null>(null);

  const setObserver = useCallback(
    (observer: BleObserver) => {
      observerRef.current = observer;
      observer.onStateChanged?.(bleState);
      observer.onStarted?.(isScanning);
      observer.onConnectionAttemptStatus?.(isConnecting);
      if (connectedDevice) {
        observer.onDeviceConnected?.(connectedDevice);
      } else {
        observer.onDeviceDisconnected?.(null);
      }
    },
    [bleState, isScanning, isConnecting, connectedDevice],
  );

  useEffect(() => {
    bleManager.state().then(initialState => {
      setBleState(initialState);
      observerRef.current.onStateChanged?.(initialState);
    });

    stateSubscriptionRef.current = bleManager.onStateChange(state => {
      setBleState(state);
      observerRef.current.onStateChanged?.(state);
      if (state !== State.PoweredOn && isScanning) {
        try {
          bleManager.stopDeviceScan();
          setIsScanning(false);
          observerRef.current.onStarted?.(false);
        } catch (error) {
          observerRef.current.onError?.(
            `Error stopping scan on state change: ${error}`,
          );
        }
      }
    }, true);

    return () => {
      stateSubscriptionRef.current?.remove();
      disconnectSubscriptionRef.current?.remove();
    };
  }, [bleManager, isScanning]);

  const startScan = useCallback(async () => {
    if (isScanning) return;

    const currentBleState = await bleManager.state();
    if (currentBleState !== State.PoweredOn) {
      observerRef.current.onError?.(
        'Cannot start scan: Bluetooth is not powered on.',
      );
      setIsScanning(false);
      observerRef.current.onStarted?.(false);
      return;
    }

    try {
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          observerRef.current.onError?.(error);
          return;
        }
        if (device) {
          observerRef.current.onDeviceDetected?.(device);
        }
      });
      setIsScanning(true);
      observerRef.current.onStarted?.(true);
    } catch (error) {
      observerRef.current.onError?.(`Error starting scan: ${error}`);
      setIsScanning(false);
      observerRef.current.onStarted?.(false);
    }
  }, [bleManager, isScanning]);

  const stopScan = useCallback(() => {
    if (!isScanning) return;
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      observerRef.current.onStarted?.(false);
    } catch (error) {
      observerRef.current.onError?.(`Error stopping scan: ${error}`);
      setIsScanning(false);
      observerRef.current.onStarted?.(false);
    }
  }, [bleManager, isScanning]);

  const connectToDevice = useCallback(
    async (deviceId: string) => {
      if (isScanning) {
        stopScan();
      }
      setIsConnecting(true);
      observerRef.current.onConnectionAttemptStatus?.(true);

      try {
        disconnectSubscriptionRef.current?.remove();
        disconnectSubscriptionRef.current = bleManager.onDeviceDisconnected(
          deviceId,
          (error, device) => {
            setConnectedDevice(null);
            setIsConnecting(false);
            observerRef.current.onDeviceDisconnected?.(device, error);
            disconnectSubscriptionRef.current?.remove();
            disconnectSubscriptionRef.current = null;
          },
        );

        const device = await bleManager.connectToDevice(deviceId, {
          autoConnect: false,
          timeout: 15000,
        });

        await device.discoverAllServicesAndCharacteristics();

        setConnectedDevice(device);
        observerRef.current.onDeviceConnected?.(device);
      } catch (error) {
        observerRef.current.onError?.(`Connection Error: ${error}`);
        observerRef.current.onDeviceDisconnected?.(null, error);
        disconnectSubscriptionRef.current?.remove();
        disconnectSubscriptionRef.current = null;
      } finally {
        setIsConnecting(false);
        observerRef.current.onConnectionAttemptStatus?.(false);
      }
    },
    [bleManager, isScanning, stopScan],
  );

  const disconnectDevice = useCallback(async () => {
    const currentDevice = connectedDevice;
    if (currentDevice) {
      try {
        await bleManager.cancelDeviceConnection(currentDevice.id);
      } catch (error) {
        observerRef.current.onError?.(`Disconnection Error: ${error}`);
        observerRef.current.onDeviceDisconnected?.(currentDevice, error);
        setConnectedDevice(null);
        disconnectSubscriptionRef.current?.remove();
        disconnectSubscriptionRef.current = null;
      }
    } else {
      observerRef.current.onDeviceDisconnected?.(null);
      disconnectSubscriptionRef.current?.remove();
      disconnectSubscriptionRef.current = null;
    }
  }, [bleManager, connectedDevice]);

  const sendData = useCallback(
    async (dataString: string) => {
      if (!connectedDevice) {
        const error = new Error('No device connected');
        observerRef.current.onError?.('Cannot send data: No device connected.');
        observerRef.current.onDataSent?.(false, error);
        return;
      }

      try {
        const dataBase64 = Buffer.from(dataString).toString('base64');
        await bleManager.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          dataBase64,
        );
        console.log('Data sent successfully:', dataString);
        observerRef.current.onDataSent?.(true);
      } catch (error) {
        observerRef.current.onError?.(`Send Data Error: ${error}`);
        observerRef.current.onDataSent?.(false, error);
      }
    },
    [bleManager, connectedDevice],
  );

  const monitorImuData = (
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    onData: (d: SixAxisData) => void,
    onError: (e: any) => void,
  ) => {
    console.log(`Subscribing to indications on ${CHARACTERISTIC_UUID}`);
    const subscription = bleManager.monitorCharacteristicForDevice(
      deviceId,
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          return onError(error);
        }
        if (characteristic?.value) {
          const raw = Buffer.from(characteristic.value, 'base64');
          if (raw.length === 12) {
            onData({
              ax: raw.readInt16LE(0),
              ay: raw.readInt16LE(2),
              az: raw.readInt16LE(4),
              gx: raw.readInt16LE(6),
              gy: raw.readInt16LE(8),
              gz: raw.readInt16LE(10),
            });
          }
        }
      },
      `imu-monitor-${deviceId}`,
    );
    return () => subscription.remove();
  };

  return {
    bleState,
    isScanning,
    isConnecting,
    connectedDevice,
    setObserver,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    sendData,
    monitorImuData,
  };
};
