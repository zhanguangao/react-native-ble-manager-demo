import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface CharacteristicProps {
  label: string;
  action: string;
  characteristics: any[];
  onPress: (...args: any[]) => void;
  content: string;
  input?: {
    inputText: string;
    setInputText: (text: string) => void;
  };
}

const Characteristic: React.FC<CharacteristicProps> = props => {
  const {label, action, characteristics, onPress, content, input} = props;

  if (characteristics.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={{color: 'black'}}>{label}</Text>
      <Text style={styles.content}>{content}</Text>
      {input && (
        <TextInput
          style={styles.textInput}
          value={input.inputText}
          placeholder="请输入消息"
          onChangeText={text => {
            input.setInputText(text);
          }}
        />
      )}
      {characteristics.map((item, index) => {
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            style={styles.buttonView}
            onPress={() => {
              onPress(index);
            }}>
            <Text style={styles.buttonText}>
              {action} ({item})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderColor: '#eee',
    borderStyle: 'solid',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  buttonView: {
    height: 30,
    backgroundColor: 'rgb(33, 150, 243)',
    paddingHorizontal: 10,
    borderRadius: 5,
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
  },
  content: {
    marginTop: 5,
    marginBottom: 15,
  },
  textInput: {
    paddingLeft: 5,
    paddingRight: 5,
    backgroundColor: 'white',
    height: 50,
    fontSize: 16,
    flex: 1,
  },
});

export default Characteristic;
