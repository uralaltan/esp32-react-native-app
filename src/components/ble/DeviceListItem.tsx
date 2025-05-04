import React from 'react';
import {TouchableOpacity, StyleSheet, Text, View} from 'react-native';
import {ListItem} from 'react-native-elements';
import {Device} from 'react-native-ble-plx';
import {colors} from '../../constants/colors';

interface DeviceListItemProps {
  device: Device;
  isConnected: boolean;
  isConnecting: boolean;
  onPress: (device: Device) => void;
}

const DeviceListItem: React.FC<DeviceListItemProps> = ({
  device,
  isConnected,
  isConnecting,
  onPress,
}) => {
  return (
    <>
      <TouchableOpacity
        onPress={() => onPress(device)}
        disabled={isConnecting && !isConnected}
        style={styles.listItem}>
        <ListItem
          containerStyle={isConnected ? styles.connectedItem : styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={[styles.text, {paddingBottom: 5}]}>
              {device.name || 'Unknown Device'}
            </ListItem.Title>
            <ListItem.Subtitle
              style={
                styles.text
              }>{`ID: ${device.id}, RSSI: ${device.rssi}`}</ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  connectedItem: {
    backgroundColor: '#404350',
  },
  listItem: {
    backgroundColor: '#404350',
    borderRadius: 10,
    marginHorizontal: 15,
    marginVertical: 3,
    paddingHorizontal: 1,
    paddingVertical: 6,
  },
  text: {
    color: colors.white,
    fontFamily: 'OpenSans-Regular',
  },
});

export default DeviceListItem;
