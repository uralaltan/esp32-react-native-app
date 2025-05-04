import React from 'react';
import {Header, HeaderProps} from 'react-native-elements';
import {colors} from '../../constants/colors';

interface AppHeaderProps extends HeaderProps {
  title: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({title, ...props}) => {
  return (
    <Header
      centerComponent={{
        text: title,
        style: {
          color: '#000',
          fontFamily: 'OpenSans-SemiBold',
          fontSize: 20,
          justifyContent: 'center',
          alignContent: 'center',
          alignItems: 'center',
          paddingBottom: 0,
          marginBottom: 0,
        },
      }}
      backgroundColor={colors.yellow}
      statusBarProps={{
        backgroundColor: colors.yellow,
        barStyle: 'dark-content',
      }}
      {...props}
    />
  );
};

export default AppHeader;
