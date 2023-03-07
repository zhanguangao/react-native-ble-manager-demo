import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  ListRenderItemInfo,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import {
  BleManagerDidUpdateStateEvent,
  Peripheral,
} from 'react-native-ble-manager';
import BleModule from './BleModule';
import BleProtocol from './BleProtocol';
import Characteristic from './components/Characteristic';
import Header from './components/Header';
import {BleEventType, BleState} from './type';

// 注意: 需要确保全局只有一个实例，因为BleModule类保存着蓝牙的连接信息
const bleModule = new BleModule();

const bleProtocol = new BleProtocol();

const App: React.FC = () => {
  // 蓝牙是否连接
  const [isConnected, setIsConnected] = useState(false);
  // 正在扫描中
  const [scaning, setScaning] = useState(false);
  // 蓝牙是否正在监听
  const [isMonitoring, setIsMonitoring] = useState(false);
  // 当前正在连接的蓝牙id
  const [connectingId, setConnectingId] = useState('');
  // 写数据
  const [writeData, setWriteData] = useState('');
  // 接收到的数据
  const [receiveData, setReceiveData] = useState('');
  // 读取的数据
  const [readData, setReadData] = useState('');
  // 输入的内容
  const [inputText, setInputText] = useState('');
  // 扫描的蓝牙列表
  const [data, setData] = useState<Peripheral[]>([]);

  /** 蓝牙接收的数据缓存 */
  const bleReceiveData = useRef<any[]>([]);
  /** 使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备 */
  const deviceMap = useRef(new Map<string, Peripheral>());

  useEffect(() => {
    bleModule.start();
  }, []);

  useEffect(() => {
    const updateStateListener = bleModule.addListener(
      BleEventType.BleManagerDidUpdateState,
      handleUpdateState,
    );
    const stopScanListener = bleModule.addListener(
      BleEventType.BleManagerStopScan,
      handleStopScan,
    );
    const discoverPeripheralListener = bleModule.addListener(
      BleEventType.BleManagerDiscoverPeripheral,
      handleDiscoverPeripheral,
    );
    const connectPeripheralListener = bleModule.addListener(
      BleEventType.BleManagerConnectPeripheral,
      handleConnectPeripheral,
    );
    const disconnectPeripheralListener = bleModule.addListener(
      BleEventType.BleManagerDisconnectPeripheral,
      handleDisconnectPeripheral,
    );
    const updateValueListener = bleModule.addListener(
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

  /** 蓝牙状态改变 */
  function handleUpdateState(event: BleManagerDidUpdateStateEvent) {
    console.log('BleManagerDidUpdateState:', event);
    bleModule.bleState = event.state;
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
    // console.log('BleManagerDiscoverPeripheral:', data);
    // 蓝牙连接 id
    let id;
    // 蓝牙 Mac 地址
    let macAddress;
    if (Platform.OS == 'android') {
      macAddress = data.id;
      id = macAddress;
    } else {
      // ios连接时不需要用到Mac地址，但跨平台识别同一设备时需要 Mac 地址
      macAddress = bleProtocol.getMacFromAdvertising(data);
      id = data.id;
    }
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
    initData();
  }

  function initData() {
    // 断开连接后清空UUID
    bleModule.initUUID();
    // 断开后显示上次的扫描结果
    setData([...deviceMap.current.values()]);
    setIsConnected(false);
    setWriteData('');
    setReadData('');
    setReceiveData('');
    setInputText('');
  }

  /** 接收到新数据 */
  function handleUpdateValue(data: any) {
    let value = data.value as string;
    console.log('BluetoothUpdateValue:', value);

    bleReceiveData.current.push(value);
    setReceiveData(bleReceiveData.current.join(''));

    bleProtocol.parseData(value);
  }

  function scan() {
    if (bleModule.bleState !== BleState.On) {
      enableBluetooth();
      return;
    }

    // 重新扫描时清空列表
    deviceMap.current.clear();
    bleModule
      .scan()
      .then(() => {
        setScaning(true);
      })
      .catch(err => {
        setScaning(false);
      });
  }

  function enableBluetooth() {
    if (Platform.OS === 'ios') {
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
            bleModule.enableBluetooth();
          },
        },
      ]);
    }
  }

  /** 连接蓝牙 */
  function connect(item: Peripheral) {
    setConnectingId(item.id);

    if (scaning) {
      // 当前正在扫描中，连接时关闭扫描
      bleModule.stopScan().then(() => {
        setScaning(false);
      });
    }

    bleModule
      .connect(item.id)
      .then(peripheralInfo => {
        setIsConnected(true);
        // 连接成功后，列表只显示已连接的设备
        setData([item]);
      })
      .catch(err => {
        alert('连接失败');
      })
      .finally(() => {
        setConnectingId('');
      });
  }

  /** 断开连接 */
  function disconnect() {
    bleModule.disconnect();
    initData();
  }

  function notify(index: number) {
    bleModule
      .startNotification(index)
      .then(() => {
        setIsMonitoring(true);
        alert('开启成功');
      })
      .catch(err => {
        setIsMonitoring(false);
        alert('开启失败');
      });
  }

  function read(index: number) {
    bleModule
      .read(index)
      .then((data: string) => {
        setReadData(data);
      })
      .catch(err => {
        alert('读取失败');
      });
  }

  function write(writeType: 'write' | 'writeWithoutResponse') {
    return (index: number) => {
      if (inputText.length === 0) {
        alert('请输入消息内容');
        return;
      }

      bleModule[writeType](inputText, index)
        .then(() => {
          bleReceiveData.current = [];
          setWriteData(inputText);
          setInputText('');
        })
        .catch(err => {
          alert('发送失败');
        });
    };
  }

  function alert(text: string) {
    Alert.alert('提示', text, [{text: '确定', onPress: () => {}}]);
  }

  function renderItem(item: ListRenderItemInfo<Peripheral>) {
    const data = item.item;
    const disabled = !!connectingId && connectingId !== data.id;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled || isConnected}
        onPress={() => {
          connect(data);
        }}
        style={[styles.item, {opacity: disabled ? 0.5 : 1}]}>
        <View style={{flexDirection: 'row'}}>
          <Text style={{color: 'black'}}>{data.name ? data.name : ''}</Text>
          <Text style={{marginLeft: 50, color: 'red'}}>
            {connectingId === data.id ? '连接中...' : ''}
          </Text>
        </View>
        <Text>{data.id}</Text>
      </TouchableOpacity>
    );
  }

  function renderFooter() {
    if (!isConnected) {
      return;
    }
    return (
      <ScrollView
        style={{
          marginTop: 10,
          borderColor: '#eee',
          borderStyle: 'solid',
          borderTopWidth: StyleSheet.hairlineWidth * 2,
        }}>
        <Characteristic
          label="写数据（write）："
          action="发送"
          content={writeData}
          characteristics={bleModule.writeWithResponseCharacteristicUUID}
          onPress={write('write')}
          input={{inputText, setInputText}}
        />

        <Characteristic
          label="写数据（writeWithoutResponse）："
          action="发送"
          content={writeData}
          characteristics={bleModule.writeWithoutResponseCharacteristicUUID}
          onPress={write('writeWithoutResponse')}
          input={{inputText, setInputText}}
        />

        <Characteristic
          label="读取的数据："
          action="读取"
          content={readData}
          characteristics={bleModule.readCharacteristicUUID}
          onPress={read}
        />

        <Characteristic
          label={`通知监听接收的数据（${
            isMonitoring ? '监听已开启' : '监听未开启'
          }）：`}
          action="开启通知"
          content={receiveData}
          characteristics={bleModule.nofityCharacteristicUUID}
          onPress={notify}
        />
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        isConnected={isConnected}
        scaning={scaning}
        disabled={scaning || !!connectingId}
        onPress={isConnected ? disconnect : scan}
      />
      <FlatList
        renderItem={renderItem}
        keyExtractor={item => item.id}
        data={data}
        extraData={connectingId}
      />
      {renderFooter()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  item: {
    flexDirection: 'column',
    borderColor: 'rgb(235,235,235)',
    borderStyle: 'solid',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingVertical: 8,
  },
});

export default App;
