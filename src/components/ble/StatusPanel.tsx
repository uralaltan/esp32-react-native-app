import React from 'react';
import {View, StyleSheet} from 'react-native';
import {ListItem} from 'react-native-elements';
import {State, Device} from 'react-native-ble-plx';
import {colors} from '../../constants/colors';

interface StatusPanelProps {
  bleState: State;
  isConnecting: boolean;
  connectedDevice: Device | null;
  error: string | null;
}

const getBleStateText = (state: State): string => {
  switch (state) {
    case State.PoweredOn:
      return 'Powered On';
    case State.PoweredOff:
      return 'Powered Off';
    case State.Resetting:
      return 'Resetting';
    case State.Unauthorized:
      return 'Unauthorized';
    case State.Unsupported:
      return 'Unsupported';
    case State.Unknown:
    default:
      return 'Initializing / Unknown';
  }
};

const StatusPanel: React.FC<StatusPanelProps> = ({
  bleState,
  isConnecting,
  connectedDevice,
  error,
}) => {
  const connectionStatusText = isConnecting
    ? 'Connecting...'
    : connectedDevice
    ? `Connected to ${connectedDevice.name || connectedDevice.id}`
    : 'Disconnected';

  const bleStatusText = getBleStateText(bleState);

  return (
    <View style={styles.statusPanel}>
      <ListItem containerStyle={styles.listItem} topDivider={false}>
        <ListItem.Content>
          <ListItem.Title style={styles.text}>BLE Status</ListItem.Title>
          <ListItem.Subtitle style={styles.text}>
            {bleStatusText}
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem containerStyle={styles.listItem}>
        <ListItem.Content>
          <ListItem.Title style={styles.text}>Connection Status</ListItem.Title>
          <ListItem.Subtitle style={styles.text}>
            {connectionStatusText}
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem containerStyle={[styles.listItem, styles.lastItem]}>
        <ListItem.Content>
          <ListItem.Title style={styles.text}>Last Error / Info</ListItem.Title>
          <ListItem.Subtitle style={styles.text}>
            {error || '-'}
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
    </View>
  );
};

const styles = StyleSheet.create({
  statusPanel: {
    backgroundColor: colors.darkerBlackBackground,
  },
  listItem: {
    backgroundColor: colors.yellow,
  },
  text: {
    color: colors.textPrimary,
    fontFamily: 'OpenSans-Regular',
  },
  lastItem: {
    borderBottomRightRadius: 33,
    borderBottomLeftRadius: 33,
    marginBottom: 9,
  },
});

export default StatusPanel;
