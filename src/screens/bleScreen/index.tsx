import React, {useEffect, useCallback, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {BleScreenRouteProp, BleScreenNavigationProp} from '../../types/type.d';
import {colors} from '../../constants/colors';
import AppHeader from '../../components/common/AppHeader';
import {icons} from '../../constants/icons';

const BleScreen = () => {
  const route = useRoute<BleScreenRouteProp>();
  const navigation = useNavigation<BleScreenNavigationProp>();
  const {device, sendDataFunction} = route.params;
  const [status, setStatus] = useState<string | null>(null);

  const handleGoBack = async () => {
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      e.preventDefault();
      (async () => {
        navigation.dispatch(e.data.action);
      })();
    });
    return unsubscribe;
  }, [navigation]);

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
        {status && <Text style={styles.statusText}>{status}</Text>}
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
});

export default BleScreen;
