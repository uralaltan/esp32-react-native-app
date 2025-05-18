import React, {useEffect, useCallback, useState, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {BleScreenRouteProp, BleScreenNavigationProp} from '../../types/type.d';
import {colors} from '../../constants/colors';
import AppHeader from '../../components/common/AppHeader';
import {icons} from '../../constants/icons';
import {useBleManager} from '../../services/bleService';
import Constants from '../../constants';

interface SixAxisData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

const BleScreen = () => {
  const route = useRoute<BleScreenRouteProp>();
  const navigation = useNavigation<BleScreenNavigationProp>();
  const {device, sendDataFunction} = route.params;
  const [status, setStatus] = useState<string | null>(null);
  const [imuData, setImuData] = useState<SixAxisData | null>(null);
  const [isMonitoringImu, setIsMonitoringImu] = useState(false);
  const {monitorImuData} = useBleManager();
  const stopMonitoringRef = useRef<(() => void) | null>(null);

  const {SERVICE_UUID, CHARACTERISTIC_UUID} = Constants.bleConstants;

  const handleGoBack = async () => {
    if (isMonitoringImu && stopMonitoringRef.current) {
      stopMonitoringRef.current();
    }
    navigation.goBack();
  };

  const handleSendData = useCallback(async () => {
    if (sendDataFunction) {
      try {
        await sendDataFunction('on');
        setStatus('Data sent successfully!');
      } catch (error) {
        setStatus(`Error sending data: ${error}`);
      }
    } else {
      setStatus('Send function not available');
    }
  }, [sendDataFunction]);

  const handleToggleImuMonitoring = useCallback(async () => {
    if (!device) {
      setStatus('Device not available for IMU monitoring.');
      return;
    }

    if (isMonitoringImu) {
      if (stopMonitoringRef.current) {
        stopMonitoringRef.current();
        stopMonitoringRef.current = null;
      }
      setIsMonitoringImu(false);
      setImuData(null);
      setStatus('IMU monitoring stopped.');
    } else {
      // Start monitoring
      setStatus('Starting IMU monitoring...');
      try {
        const cleanup = monitorImuData(
          device.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          receivedData => {
            setImuData(receivedData);
          },
          error => {
            setStatus(`IMU Monitoring Error: ${error.message}`);
            setIsMonitoringImu(false);
            if (stopMonitoringRef.current) {
              stopMonitoringRef.current();
              stopMonitoringRef.current = null;
            }
          },
        );
        stopMonitoringRef.current = cleanup;
        setIsMonitoringImu(true);
        setStatus('IMU monitoring started.');
      } catch (error: any) {
        setStatus(`Failed to start IMU monitoring: ${error.message}`);
        setIsMonitoringImu(false);
      }
    }
  }, [
    device,
    isMonitoringImu,
    monitorImuData,
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
  ]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {});

    const unsubscribeBeforeRemove = navigation.addListener(
      'beforeRemove',
      e => {
        e.preventDefault();

        if (stopMonitoringRef.current) {
          console.log(
            'Stopping IMU monitoring due to screen removal (beforeRemove)...',
          );
          stopMonitoringRef.current();
          stopMonitoringRef.current = null;
          setIsMonitoringImu(false);
        }
        navigation.dispatch(e.data.action);
      },
    );

    return () => {
      unsubscribeFocus();
      unsubscribeBeforeRemove();
      if (stopMonitoringRef.current) {
        console.log(
          'Stopping IMU monitoring due to component unmount (useEffect cleanup)...',
        );
        stopMonitoringRef.current();
        stopMonitoringRef.current = null;
      }
    };
  }, [navigation, setIsMonitoringImu]);

  const renderLeftComponent = () => (
    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
      <Image style={styles.image} source={icons.leftArrow} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader title={'BLE Manager'} leftComponent={renderLeftComponent()} />
      <View style={styles.content}>
        <Text style={styles.text}>Connected to:</Text>
        <Text style={styles.infoText}>Name: {device.name || 'N/A'}</Text>
        <Text style={styles.infoText}>ID: {device.id}</Text>
        <Text style={styles.infoText}>RSSI: {device.rssi}</Text>
        <TouchableOpacity style={styles.button} onPress={handleSendData}>
          <Text style={styles.buttonText}>Send "on"</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleToggleImuMonitoring}>
          <Text style={styles.buttonText}>
            {isMonitoringImu ? 'Stop IMU Monitoring' : 'Start IMU Monitoring'}
          </Text>
        </TouchableOpacity>

        {status && <Text style={styles.statusText}>{status}</Text>}

        {imuData && (
          <View style={styles.imuDataContainer}>
            <Text style={styles.text}>IMU Data:</Text>
            <Text style={styles.infoText}>Ax: {imuData.ax}</Text>
            <Text style={styles.infoText}>Ay: {imuData.ay}</Text>
            <Text style={styles.infoText}>Az: {imuData.az}</Text>
            <Text style={styles.infoText}>Gx: {imuData.gx}</Text>
            <Text style={styles.infoText}>Gy: {imuData.gy}</Text>
            <Text style={styles.infoText}>Gz: {imuData.gz}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 5,
    padding: 3,
  },
  container: {
    flex: 1,
    backgroundColor: colors.darkerBlackBackground,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  text: {
    color: colors.white,
    fontSize: 18,
    marginBottom: 10,
    fontFamily: 'OpenSans-SemiBold',
  },
  infoText: {
    color: colors.white,
    fontSize: 16,
    marginBottom: 5,
    fontFamily: 'OpenSans-Regular',
  },
  button: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'OpenSans-SemiBold',
  },
  buttonContainer: {
    marginTop: 20,
  },
  image: {
    width: 24,
    height: 24,
  },
  statusText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 10,
    fontFamily: 'OpenSans-Regular',
  },
  imuDataContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colors.black,
    borderRadius: 5,
  },
});

export default BleScreen;
