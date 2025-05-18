import React, {useEffect, useCallback, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import Share from 'react-native-share';
import {
  BleScreenRouteProp,
  BleScreenNavigationProp,
  SixAxisData,
  IMURecording,
} from '../../types/type.d';
import {colors} from '../../constants/colors';
import AppHeader from '../../components/common/AppHeader';
import {icons} from '../../constants/icons';
import {useBleManager} from '../../services/bleService';
import excelService from '../../services/excelService';
import Constants from '../../constants';

const BleScreen = () => {
  const route = useRoute<BleScreenRouteProp>();
  const navigation = useNavigation<BleScreenNavigationProp>();
  const {device, sendDataFunction} = route.params;
  const [status, setStatus] = useState<string | null>(null);
  const [imuData, setImuData] = useState<SixAxisData | null>(null);
  const [isMonitoringImu, setIsMonitoringImu] = useState(false);
  const {monitorImuData} = useBleManager();
  const stopMonitoringRef = useRef<(() => void) | null>(null);

  const [currentRecording, setCurrentRecording] = useState<
    Omit<IMURecording, 'isFall'>
  >({
    axData: [],
    ayData: [],
    azData: [],
    gxData: [],
    gyData: [],
    gzData: [],
  });
  const [showClassificationButtons, setShowClassificationButtons] =
    useState(false);
  const [canShareExcel, setCanShareExcel] = useState(
    excelService.getRecordedSessionsCount() > 0,
  );

  const {SERVICE_UUID, CHARACTERISTIC_UUID} = Constants.bleConstants;

  const handleGoBack = async () => {
    if (isMonitoringImu && stopMonitoringRef.current) {
      stopMonitoringRef.current();
    }
    navigation.goBack();
  };

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
      setShowClassificationButtons(false);
      setImuData(null);
      setStatus('IMU monitoring stopped.');
    } else {
      setCurrentRecording({
        axData: [],
        ayData: [],
        azData: [],
        gxData: [],
        gyData: [],
        gzData: [],
      });
      setStatus('Starting IMU monitoring...');
      try {
        const cleanup = monitorImuData(
          device.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          receivedData => {
            setImuData(receivedData);
            setCurrentRecording(prev => ({
              axData: [...prev.axData, receivedData.ax],
              ayData: [...prev.ayData, receivedData.ay],
              azData: [...prev.azData, receivedData.az],
              gxData: [...prev.gxData, receivedData.gx],
              gyData: [...prev.gyData, receivedData.gy],
              gzData: [...prev.gzData, receivedData.gz],
            }));
          },
          error => {
            setStatus(`IMU Monitoring Error: ${error.message}`);
            setIsMonitoringImu(false);
            setShowClassificationButtons(false);
            if (stopMonitoringRef.current) {
              stopMonitoringRef.current();
              stopMonitoringRef.current = null;
            }
          },
        );
        stopMonitoringRef.current = cleanup;
        setIsMonitoringImu(true);
        setShowClassificationButtons(true);
        setStatus('IMU monitoring started.');
      } catch (error: any) {
        setStatus(`Failed to start IMU monitoring: ${error.message}`);
        setIsMonitoringImu(false);
        setShowClassificationButtons(false);
      }
    }
  }, [
    device,
    isMonitoringImu,
    monitorImuData,
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
  ]);

  const handleClassification = (isFall: boolean) => {
    if (stopMonitoringRef.current) {
      stopMonitoringRef.current();
      stopMonitoringRef.current = null;
    }
    setIsMonitoringImu(false);
    setShowClassificationButtons(false);
    setImuData(null);

    const finalRecording: IMURecording = {
      ...currentRecording,
      isFall: isFall ? 1 : 0,
    };
    excelService.addRecordingSession(finalRecording);
    setCanShareExcel(true);
    setStatus(
      `Data classified as ${
        isFall ? 'Fall' : 'Non-Fall'
      }. Ready to share or record new data.`,
    );
    setCurrentRecording({
      axData: [],
      ayData: [],
      azData: [],
      gxData: [],
      gyData: [],
      gzData: [],
    });
  };

  const handleShareExcel = async () => {
    if (!canShareExcel) {
      Alert.alert('No Data', 'No data has been recorded and classified yet.');
      return;
    }
    try {
      setStatus('Preparing Excel for sharing...');
      const path = await excelService.saveToExcel();
      if (path) {
        const shareOptions = {
          title: 'Share IMU Data',
          message: 'Here is the IMU data Excel file.',
          url: Platform.OS === 'android' ? `file://${path}` : path,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          failOnCancel: false,
        };
        await Share.open(shareOptions);
        setStatus('Excel file shared.');
      } else {
        throw new Error('Failed to get file path for sharing.');
      }
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        setStatus('Sharing cancelled.');
      } else {
        Alert.alert(
          'Share Failed',
          error.message || 'Could not share Excel file.',
        );
        setStatus(`Share failed: ${error.message || 'Unknown error'}`);
      }
      console.error('Share error:', error);
    }
  };

  useEffect(() => {
    setCanShareExcel(excelService.getRecordedSessionsCount() > 0);

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
        setIsMonitoringImu(false);
        setShowClassificationButtons(false);
      }
    };
  }, [navigation]);

  const renderLeftComponent = () => (
    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
      <Image style={styles.image} source={icons.leftArrow} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader title={'BLE Manager'} leftComponent={renderLeftComponent()} />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.text}>Connected to:</Text>
        <Text style={styles.infoText}>Name: {device.name || 'N/A'}</Text>
        <Text style={styles.infoText}>ID: {device.id}</Text>

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

        {showClassificationButtons && (
          <View style={styles.classificationContainer}>
            <TouchableOpacity
              style={[styles.classificationButton, styles.fallButton]}
              onPress={() => handleClassification(true)}>
              <Text style={styles.buttonText}>Fall</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.classificationButton, styles.nonFallButton]}
              onPress={() => handleClassification(false)}>
              <Text style={styles.buttonText}>Non-Fall</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.downloadButton,
            !canShareExcel && styles.disabledButton,
          ]}
          onPress={handleShareExcel}
          disabled={!canShareExcel}>
          <Text style={styles.buttonText}>Share Excel</Text>
        </TouchableOpacity>
      </ScrollView>
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
    backgroundColor: colors.blackBackground,
    borderRadius: 5,
    marginBottom: 10,
  },
  classificationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
  },
  classificationButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 120,
  },
  fallButton: {
    backgroundColor: colors.danger,
  },
  nonFallButton: {
    backgroundColor: colors.success,
  },
  downloadButton: {
    backgroundColor: colors.successLight,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: colors.grey,
    opacity: 0.6,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
});

export default BleScreen;
