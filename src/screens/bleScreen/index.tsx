import React, {useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {BleScreenRouteProp, BleScreenNavigationProp} from '../../types/type.d';
import {colors} from '../../constants/colors';
import AppHeader from '../../components/common/AppHeader';
import {useBleManager} from '../../services/bleService';
import {icons} from '../../constants/icons';

const BleScreen = () => {
  const route = useRoute<BleScreenRouteProp>();
  const navigation = useNavigation<BleScreenNavigationProp>();
  const {disconnectDevice} = useBleManager();
  const {device} = route.params;

  useEffect(() => {
    return () => {
      disconnectDevice();
    };
  }, [disconnectDevice]);

  const handleGoBack = async () => {
    await disconnectDevice();
    navigation.goBack();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      e.preventDefault();
      (async () => {
        await disconnectDevice();
        navigation.dispatch(e.data.action);
      })();
    });
    return unsubscribe;
  }, [navigation, disconnectDevice]);

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
  buttonContainer: {
    marginTop: 20,
  },
  image: {
    width: 24,
    height: 24,
  },
});

export default BleScreen;
