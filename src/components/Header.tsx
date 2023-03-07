import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

interface HeaderProps {
  isConnected: boolean;
  scaning: boolean;
  disabled: boolean;
  onPress: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  scaning,
  disabled,
  onPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.buttonView, {opacity: disabled ? 0.7 : 1}]}
        disabled={disabled}
        onPress={onPress}>
        <Text style={[styles.buttonText]}>
          {scaning ? '正在搜索中' : isConnected ? '断开蓝牙连接' : '搜索蓝牙'}
        </Text>
      </TouchableOpacity>

      <Text style={{marginLeft: 10, marginTop: 10}}>
        {isConnected ? '当前连接的设备' : '可用设备'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  buttonView: {
    backgroundColor: 'rgb(33, 150, 243)',
    paddingHorizontal: 10,
    marginHorizontal: 10,
    borderRadius: 5,
    marginTop: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
  },
});

export default Header;
