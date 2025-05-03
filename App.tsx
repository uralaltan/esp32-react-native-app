import React from 'react';
import {StatusBar} from 'react-native';
import {createStaticNavigation} from '@react-navigation/native';
import RootStack from './src/navigation/RootNavigation';
import {colors} from './src/constants/colors';

function App(): React.JSX.Element {
  const Navigation = createStaticNavigation(RootStack);

  return (
    <>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
      <Navigation />
    </>
  );
}

export default App;
