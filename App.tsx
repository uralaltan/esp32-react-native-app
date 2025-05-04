import React from 'react';
import {StatusBar, Platform, View, SafeAreaView} from 'react-native';
import {createStaticNavigation} from '@react-navigation/native';
import RootStack from './src/navigation/RootNavigation';
import {colors} from './src/constants/colors';

function App(): React.JSX.Element {
  const Navigation = createStaticNavigation(RootStack);

  return (
    <View style={{flex: 1, backgroundColor: colors.yellow}}>
      <SafeAreaView style={{flex: 0, backgroundColor: colors.yellow}} />
      <StatusBar
        backgroundColor={colors.yellow}
        barStyle="dark-content"
        translucent={false}
      />
      <SafeAreaView
        style={{flex: 1, backgroundColor: colors.darkerBlackBackground}}>
        <Navigation />
      </SafeAreaView>
    </View>
  );
}

export default App;
