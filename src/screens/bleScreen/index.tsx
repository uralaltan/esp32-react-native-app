import React, {useEffect, useCallback, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {
  BleScreenRouteProp,
  BleScreenNavigationProp,
  SixAxisData,
} from '../../types/type.d';
import {colors} from '../../constants/colors';
import AppHeader from '../../components/common/AppHeader';
import {icons} from '../../constants/icons';
import {useBleManager} from '../../services/bleService';
import Constants from '../../constants';

const API_URL = 'https://Haru2.pythonanywhere.com';

const BleScreen = () => {
  const {device} = useRoute<BleScreenRouteProp>().params;
  const navigation = useNavigation<BleScreenNavigationProp>();
  const [status, setStatus] = useState<string | null>(null);
  const [imuData, setImuData] = useState<SixAxisData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(10);
  const stopRef = useRef<() => void | null>(null);
  const firstRef = useRef(false);
  const {monitorImuData} = useBleManager();
  const axBuf = useRef<number[]>([]);
  const ayBuf = useRef<number[]>([]);
  const azBuf = useRef<number[]>([]);
  const gxBuf = useRef<number[]>([]);
  const gyBuf = useRef<number[]>([]);
  const gzBuf = useRef<number[]>([]);
  const {SERVICE_UUID, CHARACTERISTIC_UUID} = Constants.bleConstants;

  const computeFeatures = () => {
    const axes = {
      ax: axBuf.current,
      ay: ayBuf.current,
      az: azBuf.current,
      gx: gxBuf.current,
      gy: gyBuf.current,
      gz: gzBuf.current,
    };
    const payload: Record<string, number> = {};
    Object.entries(axes).forEach(([k, arr]) => {
      const last20 = arr.slice(-20);
      if (last20.length === 0) return;
      const mean = last20.reduce((a, b) => a + b, 0) / last20.length;
      const variance =
        last20.reduce((a, b) => a + (b - mean) ** 2, 0) / last20.length;
      const std = Math.sqrt(variance);
      payload[`${k}_mean`] = mean;
      payload[`${k}_std`] = std;
      payload[`${k}_min`] = Math.min(...last20);
      payload[`${k}_max`] = Math.max(...last20);
    });
    console.log('computeFeatures ->', payload);
    return payload;
  };

  const fetchPrediction = async () => {
    console.log('fetchPrediction at', new Date().toISOString());
    const body = computeFeatures();
    if (!Object.keys(body).length) return console.log('No data, skip');
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const text = await res.text();
      console.log('Status', res.status, 'Body', text);
      if (!res.ok) return setStatus(`Error ${res.status}`);
      const json = JSON.parse(text);
      console.log('Parsed', json);
      setPrediction(json.prediction);
      setStatus(`Prediction: ${json.prediction}`);
    } catch (e: any) {
      console.error('Fetch failed', e);
      setStatus(`Fetch error: ${e.message}`);
    }
  };

  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      stopRef.current?.();
      stopRef.current = null;
      setIsMonitoring(false);
      setStatus('Monitoring stopped');
      setPrediction(null);
      setCountdown(10);
      firstRef.current = false;
      axBuf.current = [];
      ayBuf.current = [];
      azBuf.current = [];
      gxBuf.current = [];
      gyBuf.current = [];
      gzBuf.current = [];
    } else {
      setStatus('Waiting for first IMU sample…');
      const cleanup = monitorImuData(
        device.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        data => {
          console.log('IMU data:', data);
          if (!firstRef.current) {
            firstRef.current = true;
            setIsMonitoring(true);
            setCountdown(10);
            setStatus('Monitoring started');
          }
          setImuData(data);
          axBuf.current.push(data.ax);
          if (axBuf.current.length > 20) axBuf.current.shift();
          ayBuf.current.push(data.ay);
          if (ayBuf.current.length > 20) ayBuf.current.shift();
          azBuf.current.push(data.az);
          if (azBuf.current.length > 20) azBuf.current.shift();
          gxBuf.current.push(data.gx);
          if (gxBuf.current.length > 20) gxBuf.current.shift();
          gyBuf.current.push(data.gy);
          if (gyBuf.current.length > 20) gyBuf.current.shift();
          gzBuf.current.push(data.gz);
          if (gzBuf.current.length > 20) gzBuf.current.shift();
        },
        err => {
          console.error('BLE error', err);
          setStatus(`BLE error: ${err.message}`);
          stopRef.current?.();
          stopRef.current = null;
          setIsMonitoring(false);
        },
      );
      stopRef.current = cleanup;
    }
  }, [device, isMonitoring, monitorImuData, SERVICE_UUID, CHARACTERISTIC_UUID]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMonitoring) {
      timer = setInterval(() => {
        setCountdown(c => {
          console.log('Countdown', c);
          if (c <= 1) {
            fetchPrediction();
            return 10;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isMonitoring]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      stopRef.current?.();
    });
    return () => {
      unsub();
      stopRef.current?.();
    };
  }, [navigation]);

  const renderBack = () => (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={styles.backButton}>
      <Image source={icons.leftArrow} style={styles.image} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="BLE Manager" leftComponent={renderBack()} />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}>
        <Text style={styles.text}>Connected to:</Text>
        <Text style={styles.info}>Name: {device.name || 'N/A'}</Text>
        <Text style={styles.info}>ID: {device.id}</Text>
        <TouchableOpacity style={styles.button} onPress={toggleMonitoring}>
          <Text style={styles.btnText}>
            {isMonitoring ? 'Stop IMU Monitoring' : 'Start IMU Monitoring'}
          </Text>
        </TouchableOpacity>
        {status && <Text style={styles.status}>{status}</Text>}
        {imuData && (
          <View style={styles.imuContainer}>
            <Text style={styles.text}>IMU Data:</Text>
            <Text style={styles.info}>Ax: {imuData.ax}</Text>
            <Text style={styles.info}>Ay: {imuData.ay}</Text>
            <Text style={styles.info}>Az: {imuData.az}</Text>
            <Text style={styles.info}>Gx: {imuData.gx}</Text>
            <Text style={styles.info}>Gy: {imuData.gy}</Text>
            <Text style={styles.info}>Gz: {imuData.gz}</Text>
          </View>
        )}
        {prediction !== null && (
          <View style={styles.predContainer}>
            <Text style={styles.text}>Prediction:</Text>
            <Text style={styles.info}>
              {prediction === 1 ? 'Fall' : 'Non-Fall'}
            </Text>
          </View>
        )}
        {isMonitoring && (
          <View style={styles.countContainer}>
            <Text style={styles.text}>Next prediction in:</Text>
            <Text style={styles.countText}>{countdown}s</Text>
          </View>
        )}
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
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  text: {
    color: colors.white,
    fontSize: 18,
    marginBottom: 10,
    fontFamily: 'OpenSans-SemiBold',
  },
  info: {
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
  btnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'OpenSans-SemiBold',
  },
  image: {
    width: 24,
    height: 24,
  },
  status: {
    color: colors.white,
    fontSize: 16,
    marginTop: 10,
    fontFamily: 'OpenSans-Regular',
  },
  imuContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colors.blackBackground,
    borderRadius: 5,
  },
  predContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colors.blackBackground,
    borderRadius: 5,
  },
  countContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  countText: {
    color: colors.primary,
    fontSize: 32,
    fontFamily: 'OpenSans-SemiBold',
  },
});

export default BleScreen;
