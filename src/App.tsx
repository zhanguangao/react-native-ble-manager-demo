import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  ListRenderItemInfo,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BleManagerDidUpdateStateEvent,
  Peripheral,
} from 'react-native-ble-manager';
import BleModule from './BleModule';
import BleProtocol from './BleProtocol';
import {BleEventType, BleState} from './type';

// 注意: 需要确保全局只有一个BleManager实例，因为BleModule类保存着蓝牙的连接信息
const BleManager = new BleModule();

const BluetoothProtocol = new BleProtocol();

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [scaning, setScaning] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [text, setText] = useState('');
  const [writeData, setWriteData] = useState('');
  const [receiveData, setReceiveData] = useState('');
  const [readData, setReadData] = useState('');
  const [data, setData] = useState<any[]>([]);

  /** 蓝牙接收的数据缓存 */
  const bleReceiveData = useRef<any[]>([]);
  /** 使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备 */
  const deviceMap = useRef(new Map());

  useEffect(() => {
    // 初始化
    BleManager.start();
    const updateStateListener = BleManager.addListener(
      BleEventType.BleManagerDidUpdateState,
      handleUpdateState,
    );
    const stopScanListener = BleManager.addListener(
      BleEventType.BleManagerStopScan,
      handleStopScan,
    );
    const discoverPeripheralListener = BleManager.addListener(
      BleEventType.BleManagerDiscoverPeripheral,
      handleDiscoverPeripheral,
    );
    const connectPeripheralListener = BleManager.addListener(
      BleEventType.BleManagerConnectPeripheral,
      handleConnectPeripheral,
    );
    const disconnectPeripheralListener = BleManager.addListener(
      BleEventType.BleManagerDisconnectPeripheral,
      handleDisconnectPeripheral,
    );
    const updateValueListener = BleManager.addListener(
      BleEventType.BleManagerDidUpdateValueForCharacteristic,
      handleUpdateValue,
    );

    return () => {
      updateStateListener.remove();
      stopScanListener.remove();
      discoverPeripheralListener.remove();
      connectPeripheralListener.remove();
      disconnectPeripheralListener.remove();
      updateValueListener.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (isConnected) {
        // 退出时断开蓝牙连接
        BleManager.disconnect();
      }
    };
  }, [isConnected]);

  /** 蓝牙状态改变 */
  function handleUpdateState(event: BleManagerDidUpdateStateEvent) {
    console.log('BleManagerDidUpdateState:', event);
    BleManager.bleState = event.state;
    // 蓝牙打开时自动扫描
    if (event.state === BleState.On) {
      scan();
    }
  }

  /** 扫描结束监听 */
  function handleStopScan() {
    console.log('Scanning is stopped');
    setScaning(false);
  }

  /** 搜索到一个新设备监听 */
  function handleDiscoverPeripheral(data: Peripheral) {
    console.log('BleManagerDiscoverPeripheral:', data);
    // 蓝牙连接 id
    let id;
    // 蓝牙 Mac 地址
    let macAddress;
    if (Platform.OS == 'android') {
      macAddress = data.id;
      id = macAddress;
    } else {
      // ios连接时不需要用到Mac地址，但跨平台识别同一设备时需要 Mac 地址
      macAddress = BluetoothProtocol.getMacFromAdvertising(data);
      id = data.id;
    }
    // 使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备
    deviceMap.current.set(data.id, data);
    setData([...deviceMap.current.values()]);
  }

  /** 蓝牙设备已连接 */
  function handleConnectPeripheral(data: Peripheral) {
    console.log('BleManagerConnectPeripheral:', data);
  }

  /** 蓝牙设备已断开连接 */
  function handleDisconnectPeripheral(data: Peripheral) {
    console.log('BleManagerDisconnectPeripheral:', data);
    // 断开后显示上次的扫描结果
    let newData = [...deviceMap.current.values()];
    // 断开连接后清空UUID
    BleManager.initUUID();
    setData(newData);
    setIsConnected(false);
    setWriteData('');
    setReadData('');
    setReceiveData('');
    setText('');
  }

  /** 接收到新数据 */
  function handleUpdateValue(data: any) {
    let value = data.value as string;
    console.log('BluetoothUpdateValue:', value);

    bleReceiveData.current.push(value);
    setReceiveData(bleReceiveData.current.join(''));

    BluetoothProtocol.parseData(value);
  }

  /** 连接蓝牙 */
  async function connect(item: any, index: number) {
    // 当前蓝牙正在连接时不能打开另一个连接进程
    if (BleManager.isConnecting) {
      console.log('当前蓝牙正在连接时不能打开另一个连接进程');
      return;
    }
    if (scaning) {
      // 当前正在扫描中，连接时关闭扫描
      await BleManager.stopScan();
      setScaning(false);
    }
    let newData = [...deviceMap.current.values()];
    newData[index].isConnecting = true;
    setData(newData);

    BleManager.connect(item.id)
      .then(peripheralInfo => {
        let newData = [...data];
        newData[index].isConnecting = false;
        // 连接成功，列表只显示已连接的设备
        setData([item]);
        setIsConnected(true);
      })
      .catch(err => {
        let newData = [...data];
        newData[index].isConnecting = false;
        setData(newData);
        alert('连接失败');
      });
  }

  /** 断开连接 */
  function disconnect() {
    setData([...deviceMap.current.values()]);
    setIsConnected(false);
    BleManager.disconnect();
  }

  async function scan() {
    if (scaning) {
      // 当前正在扫描中, 关闭扫描
      await BleManager.stopScan();
      setScaning(false);
    }

    if (BleManager.bleState == BleState.On) {
      await BleManager.scan();
      setScaning(true);
    } else {
      BleManager.checkState();
      if (Platform.OS == 'ios') {
        alert('请开启手机蓝牙');
      } else {
        Alert.alert('提示', '请开启手机蓝牙', [
          {
            text: '取消',
            onPress: () => {},
          },
          {
            text: '打开',
            onPress: () => {
              BleManager.enableBluetooth();
            },
          },
        ]);
      }
    }
  }

  function alert(text: string) {
    Alert.alert('提示', text, [{text: '确定', onPress: () => {}}]);
  }

  function write(index: number) {
    if (text.length == 0) {
      alert('请输入消息');
      return;
    }
    BleManager.write(text, index)
      .then(() => {
        bleReceiveData.current = [];
        setWriteData(text);
        setText('');
      })
      .catch(err => {
        alert('发送失败');
      });
  }

  function writeWithoutResponse(index: number) {
    if (text.length == 0) {
      alert('请输入消息');
      return;
    }
    BleManager.writeWithoutResponse(text, index)
      .then(() => {
        bleReceiveData.current = [];
        setWriteData(text);
        setText('');
      })
      .catch(err => {
        alert('发送失败');
      });
  }

  function read(index: number) {
    BleManager.read(index)
      .then((data: any) => {
        setReadData(data);
      })
      .catch(err => {
        alert('读取失败');
      });
  }

  function notify(index: number) {
    BleManager.startNotification(index)
      .then(() => {
        setIsMonitoring(true);
        alert('开启成功');
      })
      .catch(err => {
        setIsMonitoring(false);
        alert('开启失败');
      });
  }

  function renderItem(item: ListRenderItemInfo<any>) {
    const data = item.item;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={isConnected ? true : false}
        onPress={() => {
          connect(data, item.index);
        }}
        style={styles.item}>
        <View style={{flexDirection: 'row'}}>
          <Text style={{color: 'black'}}>{data.name ? data.name : ''}</Text>
          <Text style={{marginLeft: 50, color: 'red'}}>
            {data.isConnecting ? '连接中...' : ''}
          </Text>
        </View>
        <Text>{data.id}</Text>
      </TouchableOpacity>
    );
  }

  function renderHeader() {
    return (
      <View style={{marginTop: 20}}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.buttonView,
            {marginHorizontal: 10, height: 40, alignItems: 'center'},
          ]}
          onPress={isConnected ? disconnect : scan}>
          <Text style={styles.buttonText}>
            {scaning ? '正在搜索中' : isConnected ? '断开蓝牙' : '搜索蓝牙'}
          </Text>
        </TouchableOpacity>

        <Text style={{marginLeft: 10, marginTop: 10}}>
          {isConnected ? '当前连接的设备' : '可用设备'}
        </Text>
      </View>
    );
  }

  function renderFooter() {
    return (
      <View style={{marginBottom: 30}}>
        {isConnected ? (
          <View>
            {renderWriteView(
              '写数据(write)：',
              '发送',
              BleManager.writeWithResponseCharacteristicUUID,
              write,
            )}
            {renderWriteView(
              '写数据(writeWithoutResponse)：',
              '发送',
              BleManager.writeWithoutResponseCharacteristicUUID,
              writeWithoutResponse,
            )}
            {renderReceiveView(
              '读取的数据：',
              '读取',
              BleManager.readCharacteristicUUID,
              read,
              readData,
            )}
            {renderReceiveView(
              '通知监听接收的数据：' +
                `${isMonitoring ? '监听已开启' : '监听未开启'}`,
              '开启通知',
              BleManager.nofityCharacteristicUUID,
              notify,
              receiveData,
            )}
          </View>
        ) : (
          <View></View>
        )}
      </View>
    );
  }

  function renderReceiveView(
    label: string,
    buttonText: string,
    characteristics: any[],
    onPress: (...args: any[]) => void,
    state: string,
  ) {
    if (characteristics.length == 0) {
      return;
    }

    return (
      <View style={{marginHorizontal: 10, marginTop: 30}}>
        <Text style={{color: 'black', marginTop: 5}}>{label}</Text>
        <Text style={styles.content}>{state}</Text>

        {characteristics.map((item, index) => {
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.buttonView}
              onPress={() => {
                onPress(index);
              }}
              key={index}>
              <Text style={styles.buttonText}>
                {buttonText} ({item})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderWriteView(
    label: string,
    buttonText: string,
    characteristics: any[],
    onPress: (...args: any[]) => void,
  ) {
    if (characteristics.length == 0) {
      return;
    }
    return (
      <View style={{marginHorizontal: 10, marginTop: 30}}>
        <Text style={{color: 'black'}}>{label}</Text>
        <Text style={styles.content}>{writeData}</Text>
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
                {buttonText} ({item})
              </Text>
            </TouchableOpacity>
          );
        })}
        <TextInput
          style={[styles.textInput]}
          value={text}
          placeholder="请输入消息"
          onChangeText={text => {
            setText(text);
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        keyExtractor={item => item.id}
        data={data}
        extraData={[
          isConnected,
          text,
          receiveData,
          readData,
          writeData,
          isMonitoring,
          scaning,
        ]}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    flexDirection: 'column',
    borderColor: 'rgb(235,235,235)',
    borderStyle: 'solid',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingVertical: 8,
  },
  buttonView: {
    height: 30,
    backgroundColor: 'rgb(33, 150, 243)',
    paddingHorizontal: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'flex-start',
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

export default App;
