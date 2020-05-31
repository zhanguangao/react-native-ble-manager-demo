import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import BleModule from "./BleModule";
import BleProtocol from "./BleProtocol";

//确保全局只有一个BleManager实例，BleModule类保存着蓝牙的连接信息
global.BluetoothManager = new BleModule();
global.BluetoothProtocol = new BleProtocol();

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      scaning: false,
      isConnected: false,
      text: "",
      writeData: "",
      receiveData: "",
      readData: "",
      isMonitoring: false,
    };
    this.bluetoothReceiveData = []; //蓝牙接收的数据缓存
    this.deviceMap = new Map();
  }

  componentDidMount() {
    BluetoothManager.start(); //蓝牙初始化
    this.updateStateListener = BluetoothManager.addListener(
      "BleManagerDidUpdateState",
      this.handleUpdateState
    );
    this.stopScanListener = BluetoothManager.addListener(
      "BleManagerStopScan",
      this.handleStopScan
    );
    this.discoverPeripheralListener = BluetoothManager.addListener(
      "BleManagerDiscoverPeripheral",
      this.handleDiscoverPeripheral
    );
    this.connectPeripheralListener = BluetoothManager.addListener(
      "BleManagerConnectPeripheral",
      this.handleConnectPeripheral
    );
    this.disconnectPeripheralListener = BluetoothManager.addListener(
      "BleManagerDisconnectPeripheral",
      this.handleDisconnectPeripheral
    );
    this.updateValueListener = BluetoothManager.addListener(
      "BleManagerDidUpdateValueForCharacteristic",
      this.handleUpdateValue
    );
  }

  componentWillUnmount() {
    this.updateStateListener.remove();
    this.stopScanListener.remove();
    this.discoverPeripheralListener.remove();
    this.connectPeripheralListener.remove();
    this.disconnectPeripheralListener.remove();
    this.updateValueListener.remove();
    if (this.state.isConnected) {
      BluetoothManager.disconnect(); //退出时断开蓝牙连接
    }
  }

  //蓝牙状态改变
  handleUpdateState = (args) => {
    console.log("BleManagerDidUpdateStatea:", args);
    BluetoothManager.bluetoothState = args.state;
    if (args.state == "on") {
      //蓝牙打开时自动搜索
      this.scan();
    }
  };

  //扫描结束监听
  handleStopScan = () => {
    console.log("BleManagerStopScan:", "Scanning is stopped");
    this.setState({ scaning: false });
  };

  //搜索到一个新设备监听
  handleDiscoverPeripheral = (data) => {
    // console.log('BleManagerDiscoverPeripheral:', data);
    console.log(data.id, data.name);
    let id; //蓝牙连接id
    let macAddress; //蓝牙Mac地址
    if (Platform.OS == "android") {
      macAddress = data.id;
      id = macAddress;
    } else {
      //ios连接时不需要用到Mac地址，但跨平台识别同一设备时需要Mac地址
      //如果广播携带有Mac地址，ios可通过广播0x18获取蓝牙Mac地址，
      macAddress = BluetoothManager.getMacAddressFromIOS(data);
      id = data.id;
    }
    this.deviceMap.set(data.id, data); //使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备
    this.setState({ data: [...this.deviceMap.values()] });
  };

  //蓝牙设备已连接
  handleConnectPeripheral = (args) => {
    console.log("BleManagerConnectPeripheral:", args);
  };

  //蓝牙设备已断开连接
  handleDisconnectPeripheral = (args) => {
    console.log("BleManagerDisconnectPeripheral:", args);
    let newData = [...this.deviceMap.values()];
    BluetoothManager.initUUID(); //断开连接后清空UUID
    this.setState({
      data: newData,
      isConnected: false,
      writeData: "",
      readData: "",
      receiveData: "",
      text: "",
    });
  };

  //接收到新数据
  handleUpdateValue = (data) => {
    //某些蓝牙设备ios接收到的是小写的16进制，android接收的是大写的16进制，统一转化为大写16进制
    let value = data.value.toUpperCase();
    this.bluetoothReceiveData.push(value);
    console.log("BluetoothUpdateValue", value);
    this.setState({ receiveData: this.bluetoothReceiveData.join("") });
    BluetoothProtocol.parseData(value);
  };

  connect(item) {
    //当前蓝牙正在连接时不能打开另一个连接进程
    if (BluetoothManager.isConnecting) {
      console.log("当前蓝牙正在连接时不能打开另一个连接进程");
      return;
    }
    if (this.state.scaning) {
      //当前正在扫描中，连接时关闭扫描
      BluetoothManager.stopScan();
      this.setState({ scaning: false });
    }
    let newData = [...this.deviceMap.values()];
    newData[item.index].isConnecting = true;
    this.setState({ data: newData });

    BluetoothManager.connect(item.item.id)
      .then((peripheralInfo) => {
        let newData = [...this.state.data];
        newData[item.index].isConnecting = false;
        //连接成功，列表只显示已连接的设备
        this.setState({
          data: [item.item],
          isConnected: true,
        });
      })
      .catch((err) => {
        let newData = [...this.state.data];
        newData[item.index].isConnecting = false;
        this.setState({ data: newData });
        this.alert("连接失败");
      });
  }

  disconnect() {
    this.setState({
      data: [...this.deviceMap.values()],
      isConnected: false,
    });
    BluetoothManager.disconnect();
  }

  scan() {
    if (this.state.scaning) {
      //当前正在扫描中
      BluetoothManager.stopScan();
      this.setState({ scaning: false });
    }
    if (BluetoothManager.bluetoothState == "on") {
      BluetoothManager.scan()
        .then(() => {
          this.setState({ scaning: true });
        })
        .catch((err) => {});
    } else {
      BluetoothManager.checkState();
      if (Platform.OS == "ios") {
        this.alert("请开启手机蓝牙");
      } else {
        Alert.alert("提示", "请开启手机蓝牙", [
          {
            text: "取消",
            onPress: () => {},
          },
          {
            text: "打开",
            onPress: () => {
              BluetoothManager.enableBluetooth();
            },
          },
        ]);
      }
    }
  }

  alert(text) {
    Alert.alert("提示", text, [{ text: "确定", onPress: () => {} }]);
  }

  write = (index) => {
    if (this.state.text.length == 0) {
      this.alert("请输入消息");
      return;
    }
    BluetoothManager.write(this.state.text, index)
      .then(() => {
        this.bluetoothReceiveData = [];
        this.setState({
          writeData: this.state.text,
          text: "",
        });
      })
      .catch((err) => {
        this.alert("发送失败");
      });
  };

  writeWithoutResponse = (index) => {
    if (this.state.text.length == 0) {
      this.alert("请输入消息");
      return;
    }
    BluetoothManager.writeWithoutResponse(this.state.text, index)
      .then(() => {
        this.bluetoothReceiveData = [];
        this.setState({
          writeData: this.state.text,
          text: "",
        });
      })
      .catch((err) => {
        this.alert("发送失败");
      });
  };

  read = (index) => {
    BluetoothManager.read(index)
      .then((data) => {
        this.setState({ readData: data });
      })
      .catch((err) => {
        this.alert("读取失败");
      });
  };

  notify = (index) => {
    BluetoothManager.startNotification(index)
      .then(() => {
        this.setState({ isMonitoring: true });
        this.alert("开启成功");
      })
      .catch((err) => {
        this.setState({ isMonitoring: false });
        this.alert("开启失败");
      });
  };

  renderItem = (item) => {
    let data = item.item;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={this.state.isConnected ? true : false}
        onPress={() => {
          this.connect(item);
        }}
        style={styles.item}
      >
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "black" }}>{data.name ? data.name : ""}</Text>
          <Text style={{ marginLeft: 50, color: "red" }}>
            {data.isConnecting ? "连接中..." : ""}
          </Text>
        </View>
        <Text>{data.id}</Text>
      </TouchableOpacity>
    );
  };

  renderHeader = () => {
    return (
      <View style={{ marginTop: 20 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.buttonView,
            { marginHorizontal: 10, height: 40, alignItems: "center" },
          ]}
          onPress={
            this.state.isConnected
              ? this.disconnect.bind(this)
              : this.scan.bind(this)
          }
        >
          <Text style={styles.buttonText}>
            {this.state.scaning
              ? "正在搜索中"
              : this.state.isConnected
              ? "断开蓝牙"
              : "搜索蓝牙"}
          </Text>
        </TouchableOpacity>

        <Text style={{ marginLeft: 10, marginTop: 10 }}>
          {this.state.isConnected ? "当前连接的设备" : "可用设备"}
        </Text>
      </View>
    );
  };

  renderFooter = () => {
    return (
      <View style={{ marginBottom: 30 }}>
        {this.state.isConnected ? (
          <View>
            {this.renderWriteView(
              "写数据(write)：",
              "发送",
              BluetoothManager.writeWithResponseCharacteristicUUID,
              this.write,
              this.state.writeData
            )}
            {this.renderWriteView(
              "写数据(writeWithoutResponse)：",
              "发送",
              BluetoothManager.writeWithoutResponseCharacteristicUUID,
              this.writeWithoutResponse,
              this.state.writeData
            )}
            {this.renderReceiveView(
              "读取的数据：",
              "读取",
              BluetoothManager.readCharacteristicUUID,
              this.read,
              this.state.readData
            )}
            {this.renderReceiveView(
              "通知监听接收的数据：" +
                `${this.state.isMonitoring ? "监听已开启" : "监听未开启"}`,
              "开启通知",
              BluetoothManager.nofityCharacteristicUUID,
              this.notify,
              this.state.receiveData
            )}
          </View>
        ) : (
          <View></View>
        )}
      </View>
    );
  };

  renderReceiveView = (label, buttonText, characteristics, onPress, state) => {
    if (characteristics.length == 0) {
      return;
    }
    return (
      <View style={{ marginHorizontal: 10, marginTop: 30 }}>
        <Text style={{ color: "black", marginTop: 5 }}>{label}</Text>
        <Text style={styles.content}>{state}</Text>
        {characteristics.map((item, index) => {
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.buttonView}
              onPress={() => {
                onPress(index);
              }}
              key={index}
            >
              <Text style={styles.buttonText}>
                {buttonText} ({item})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  renderWriteView = (label, buttonText, characteristics, onPress, state) => {
    if (characteristics.length == 0) {
      return;
    }
    return (
      <View style={{ marginHorizontal: 10, marginTop: 30 }} behavior="padding">
        <Text style={{ color: "black" }}>{label}</Text>
        <Text style={styles.content}>{this.state.writeData}</Text>
        {characteristics.map((item, index) => {
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              style={styles.buttonView}
              onPress={() => {
                onPress(index);
              }}
            >
              <Text style={styles.buttonText}>
                {buttonText} ({item})
              </Text>
            </TouchableOpacity>
          );
        })}
        <TextInput
          style={[styles.textInput]}
          value={this.state.text}
          placeholder="请输入消息"
          onChangeText={(text) => {
            this.setState({ text: text });
          }}
        />
      </View>
    );
  };

  render() {
    return (
      <View style={styles.container}>
        <FlatList
          renderItem={this.renderItem}
          ListHeaderComponent={this.renderHeader}
          ListFooterComponent={this.renderFooter}
          keyExtractor={(item) => item.id}
          data={this.state.data}
          extraData={[
            this.state.isConnected,
            this.state.text,
            this.state.receiveData,
            this.state.readData,
            this.state.writeData,
            this.state.isMonitoring,
            this.state.scaning,
          ]}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    marginTop: Platform.OS == "ios" ? 20 : 0,
  },
  item: {
    flexDirection: "column",
    borderColor: "rgb(235,235,235)",
    borderStyle: "solid",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingVertical: 8,
  },
  buttonView: {
    height: 30,
    backgroundColor: "rgb(33, 150, 243)",
    paddingHorizontal: 10,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    alignItems: "flex-start",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 12,
  },
  content: {
    marginTop: 5,
    marginBottom: 15,
  },
  textInput: {
    paddingLeft: 5,
    paddingRight: 5,
    backgroundColor: "white",
    height: 50,
    fontSize: 16,
    flex: 1,
  },
});
