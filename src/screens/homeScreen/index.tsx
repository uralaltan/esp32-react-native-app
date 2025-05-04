import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Switch,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import {Device} from 'react-native-ble-plx';
import {useNavigation} from '@react-navigation/native';

import {useBleManager} from '../../services/bleService';
import {BleObserver, HomeScreenNavigationProp} from '../../types/type.d';
import Constants from '../../constants';
import AppHeader from '../../components/common/AppHeader';
import StatusPanel from '../../components/ble/StatusPanel';
import DeviceListItem from '../../components/ble/DeviceListItem';
import {colors} from '../../constants/colors';

const {DEVICE_LIST_LIMIT} = Constants.bleConstants;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {
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
  } = useBleManager();

  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    const observer: BleObserver = {
      onStarted: scanning => {
        if (!scanning) {
          setError(null);
        }
      },
      onStateChanged: state => {},
      onDeviceDetected: (device: Device) => {
        setDevices(prevDevices => {
          const existingDeviceIndex = prevDevices.findIndex(
            d => d.id === device.id,
          );
          let updatedDevices;
          if (existingDeviceIndex > -1) {
            updatedDevices = [...prevDevices];
            updatedDevices[existingDeviceIndex] = device;
          } else {
            updatedDevices = [device, ...prevDevices];
            if (updatedDevices.length > DEVICE_LIST_LIMIT) {
              updatedDevices = updatedDevices.slice(0, DEVICE_LIST_LIMIT);
            }
          }
          return updatedDevices;
        });
      },
      onError: err => {
        setError(err.toString());
      },
      onDeviceConnected: device => {
        setError(null);
        navigation.navigate('Ble', {device, sendDataFunction: sendData});
      },
      onDeviceDisconnected: (device, err) => {
        if (err) {
          setError(`Disconnected: ${err.reason || err.message || 'Unknown'}`);
        } else {
          setError('Disconnected');
        }
      },
      onConnectionAttemptStatus: connectingStatus => {
        if (connectingStatus) setError(null);
      },
      onDataSent: (success, err) => {
        if (success) {
          setError("Data 'Test Data' sent!");
        } else if (err) {
          setError(`Send Error: ${err.message || 'Unknown'}`);
        }
      },
    };
    setObserver(observer);
  }, [setObserver, navigation]);

  const toggleScan = useCallback(() => {
    if (isScanning) {
      stopScan();
    } else {
      setDevices([]);
      setError(null);
      startScan();
    }
  }, [isScanning, startScan, stopScan]);

  const handleConnectPress = useCallback(
    async (device: Device) => {
      if (isConnecting) return;

      if (connectedDevice?.id === device.id) {
        navigation.navigate('Ble', {device, sendDataFunction: sendData});
      } else if (connectedDevice) {
        await disconnectDevice();
        connectToDevice(device.id);
      } else {
        connectToDevice(device.id);
      }
    },
    [
      connectedDevice,
      isConnecting,
      connectToDevice,
      disconnectDevice,
      navigation,
    ],
  );

  const handleDisconnectPress = useCallback(async () => {
    if (connectedDevice) {
      await disconnectDevice();
    }
  }, [connectedDevice, disconnectDevice]);

  const isScanSwitchDisabled = isConnecting || !!connectedDevice;

  const renderDeviceItem = ({item}: {item: Device}) => (
    <DeviceListItem
      device={item}
      isConnected={connectedDevice?.id === item.id}
      isConnecting={isConnecting}
      onPress={handleConnectPress}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="BLE Scanner"
        leftComponent={
          <Switch
            trackColor={{false: '#3e3e3e', true: colors.primary}}
            thumbColor={isScanning ? colors.white : colors.white}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleScan}
            value={isScanning}
            disabled={isScanSwitchDisabled}
            style={{marginLeft: 7}}
          />
        }
        rightComponent={
          isConnecting ? (
            <ActivityIndicator color="#fff" style={styles.activityIndicator} />
          ) : connectedDevice ? (
            <TouchableOpacity
              onPress={handleDisconnectPress}
              style={styles.cutButton}>
              <Text style={styles.cutButtonText}>Cut</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <StatusPanel
        bleState={bleState}
        isConnecting={isConnecting}
        connectedDevice={connectedDevice}
        error={error}
      />

      <View style={styles.listContainer}>
        <FlatList
          data={devices}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          renderItem={renderDeviceItem}
          keyExtractor={item => item.id}
          style={styles.list}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.darkerBlackBackground,
  },
  list: {
    flex: 1,
    marginBottom: 10,
  },
  sendButtonContainer: {
    marginVertical: 10,
    marginHorizontal: 15,
  },
  activityIndicator: {
    marginRight: 15,
    marginTop: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cutButton: {
    marginRight: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkerBlackBackground,
  },
  cutButtonText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'OpenSans-SemiBold',
  },
});

export default HomeScreen;
