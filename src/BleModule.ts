import {Platform, NativeModules, NativeEventEmitter} from 'react-native';
import BleManager, {PeripheralInfo} from 'react-native-ble-manager';
import {BleEventType, BleState} from './type';
import {byteToString} from './utils';

const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);

export default class BleModule {
  isConnecting: boolean;
  bleState: BleState;
  peripheralId: string;

  readServiceUUID!: any[];
  readCharacteristicUUID!: any[];
  writeWithResponseServiceUUID!: any[];
  writeWithResponseCharacteristicUUID!: any[];
  writeWithoutResponseServiceUUID!: any[];
  writeWithoutResponseCharacteristicUUID!: any[];
  nofityServiceUUID!: any[];
  nofityCharacteristicUUID!: any[];

  constructor() {
    // 蓝牙是否连接
    this.isConnecting = false;
    // 蓝牙打开状态
    this.bleState = BleState.Off;
    this.peripheralId = '';

    // initUUID
    this.initUUID();
  }

  initUUID() {
    this.readServiceUUID = [];
    this.readCharacteristicUUID = [];
    this.writeWithResponseServiceUUID = [];
    this.writeWithResponseCharacteristicUUID = [];
    this.writeWithoutResponseServiceUUID = [];
    this.writeWithoutResponseCharacteristicUUID = [];
    this.nofityServiceUUID = [];
    this.nofityCharacteristicUUID = [];
  }

  /** 添加监听器 */
  addListener(
    eventType: BleEventType,
    listener: (data: any) => void,
    context?: any,
  ) {
    return bleManagerEmitter.addListener(eventType, listener, context);
  }

  /** 初始化蓝牙模块 */
  start() {
    BleManager.start({showAlert: false})
      .then(() => {
        this.checkState();
        console.log('Init the module success');
      })
      .catch(error => {
        console.log('Init the module fail', error);
      });
  }

  /** 强制检查蓝牙状态 并触发 BleManagerDidUpdateState 事件 */
  checkState() {
    BleManager.checkState();
  }

  /** 扫描可用设备，5秒后结束 */
  scan() {
    return new Promise((resolve, reject) => {
      BleManager.scan([], 5, true)
        .then(() => {
          console.log('Scan started');
          resolve(null);
        })
        .catch(error => {
          console.log('Scan started fail', error);
          reject(error);
        });
    });
  }

  /** 停止扫描 */
  stopScan() {
    return new Promise((resolve, reject) => {
      BleManager.stopScan()
        .then(() => {
          console.log('Scan stopped');
          resolve(null);
        })
        .catch(error => {
          console.log('Scan stopped fail', error);
          reject();
        });
    });
  }

  /** 返回扫描到的蓝牙设备 */
  getDiscoveredPeripherals() {
    return new Promise((resolve, reject) => {
      BleManager.getDiscoveredPeripherals()
        .then(peripheralsArray => {
          console.log('Discovered peripherals: ', peripheralsArray);
          resolve(peripheralsArray);
        })
        .catch(error => {
          console.log('Discovered peripherals fail', error);
          reject(error);
        });
    });
  }

  /**
   * Converts UUID to full 128bit.
   *
   * @param {UUID} uuid 16bit, 32bit or 128bit UUID.
   * @returns {UUID} 128bit UUID.
   */
  fullUUID(uuid: string) {
    if (uuid.length === 4) {
      return '0000' + uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB';
    }
    if (uuid.length === 8) {
      return uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB';
    }
    return uuid.toUpperCase();
  }

  /** 获取Notify、Read、Write、WriteWithoutResponse的serviceUUID和characteristicUUID */
  getUUID(peripheralInfo: PeripheralInfo) {
    this.readServiceUUID = [];
    this.readCharacteristicUUID = [];
    this.writeWithResponseServiceUUID = [];
    this.writeWithResponseCharacteristicUUID = [];
    this.writeWithoutResponseServiceUUID = [];
    this.writeWithoutResponseCharacteristicUUID = [];
    this.nofityServiceUUID = [];
    this.nofityCharacteristicUUID = [];
    for (let item of peripheralInfo.characteristics!) {
      item.service = this.fullUUID(item.service);
      item.characteristic = this.fullUUID(item.characteristic);
      if (Platform.OS == 'android') {
        if (item.properties.Notify == 'Notify') {
          this.nofityServiceUUID.push(item.service);
          this.nofityCharacteristicUUID.push(item.characteristic);
        }
        if (item.properties.Read == 'Read') {
          this.readServiceUUID.push(item.service);
          this.readCharacteristicUUID.push(item.characteristic);
        }
        if (item.properties.Write == 'Write') {
          this.writeWithResponseServiceUUID.push(item.service);
          this.writeWithResponseCharacteristicUUID.push(item.characteristic);
        }
        if (item.properties.WriteWithoutResponse == 'WriteWithoutResponse') {
          this.writeWithoutResponseServiceUUID.push(item.service);
          this.writeWithoutResponseCharacteristicUUID.push(item.characteristic);
        }
      } else {
        // ios
        for (let property of item.properties as string[]) {
          if (property == 'Notify') {
            this.nofityServiceUUID.push(item.service);
            this.nofityCharacteristicUUID.push(item.characteristic);
          }
          if (property == 'Read') {
            this.readServiceUUID.push(item.service);
            this.readCharacteristicUUID.push(item.characteristic);
          }
          if (property == 'Write') {
            this.writeWithResponseServiceUUID.push(item.service);
            this.writeWithResponseCharacteristicUUID.push(item.characteristic);
          }
          if (property == 'WriteWithoutResponse') {
            this.writeWithoutResponseServiceUUID.push(item.service);
            this.writeWithoutResponseCharacteristicUUID.push(
              item.characteristic,
            );
          }
        }
      }
    }
    console.log('readServiceUUID', this.readServiceUUID);
    console.log('readCharacteristicUUID', this.readCharacteristicUUID);
    console.log(
      'writeWithResponseServiceUUID',
      this.writeWithResponseServiceUUID,
    );
    console.log(
      'writeWithResponseCharacteristicUUID',
      this.writeWithResponseCharacteristicUUID,
    );
    console.log(
      'writeWithoutResponseServiceUUID',
      this.writeWithoutResponseServiceUUID,
    );
    console.log(
      'writeWithoutResponseCharacteristicUUID',
      this.writeWithoutResponseCharacteristicUUID,
    );
    console.log('nofityServiceUUID', this.nofityServiceUUID);
    console.log('nofityCharacteristicUUID', this.nofityCharacteristicUUID);
  }

  /**
   * 尝试连接蓝牙。如果无法连接，可能需要先扫描设备。
   * 在 iOS 中，尝试连接到蓝牙设备不会超时，因此如果您不希望出现这种情况，则可能需要明确设置计时器。
   */
  connect(id: string): Promise<PeripheralInfo> {
    this.isConnecting = true; //当前蓝牙正在连接中
    return new Promise((resolve, reject) => {
      BleManager.connect(id)
        .then(() => {
          console.log('Connected success');
          // 获取已连接蓝牙设备的服务和特征
          return BleManager.retrieveServices(id);
        })
        .then(peripheralInfo => {
          console.log('Connected peripheralInfo', peripheralInfo);
          this.peripheralId = peripheralInfo.id;
          this.getUUID(peripheralInfo);
          resolve(peripheralInfo);
        })
        .catch(error => {
          console.log('Connected fail', error);
          reject(error);
        })
        .finally(() => {
          // 当前蓝牙连接结束
          this.isConnecting = false;
        });
    });
  }

  /** 断开蓝牙连接 */
  disconnect() {
    BleManager.disconnect(this.peripheralId)
      .then(() => {
        console.log('Disconnected');
      })
      .catch(error => {
        console.log('Disconnected fail', error);
      });
  }

  /** 打开通知 */
  startNotification(index = 0) {
    return new Promise((resolve, reject) => {
      BleManager.startNotification(
        this.peripheralId,
        this.nofityServiceUUID[index],
        this.nofityCharacteristicUUID[index],
      )
        .then(() => {
          console.log('Notification started');
          resolve(null);
        })
        .catch(error => {
          console.log('Start notification fail', error);
          reject(error);
        });
    });
  }

  /** 关闭通知 */
  stopNotification(index = 0) {
    return new Promise((resolve, reject) => {
      BleManager.stopNotification(
        this.peripheralId,
        this.nofityServiceUUID[index],
        this.nofityCharacteristicUUID[index],
      )
        .then(() => {
          console.log('Stop notification success!');
          resolve(null);
        })
        .catch(error => {
          console.log('Stop notification fail', error);
          reject(error);
        });
    });
  }

  /** 写数据到蓝牙 */
  write(data: any, index = 0) {
    // 在数据的头尾加入协议格式，如0A => FEFD010AFCFB，不同的蓝牙协议应作相应的更改
    // data = addProtocol(data);
    return new Promise((resolve, reject) => {
      BleManager.write(
        this.peripheralId,
        this.writeWithResponseServiceUUID[index],
        this.writeWithResponseCharacteristicUUID[index],
        data,
      )
        .then(() => {
          console.log('Write success', data.toString());
          resolve(null);
        })
        .catch(error => {
          console.log('Write failed', data);
          reject(error);
        });
    });
  }

  /** 写数据到蓝牙，没有响应 */
  writeWithoutResponse(data: any, index = 0) {
    return new Promise((resolve, reject) => {
      BleManager.writeWithoutResponse(
        this.peripheralId,
        this.writeWithoutResponseServiceUUID[index],
        this.writeWithoutResponseCharacteristicUUID[index],
        data,
      )
        .then(() => {
          console.log('Write success', data);
          resolve(null);
        })
        .catch(error => {
          console.log('Write failed', data);
          reject(error);
        });
    });
  }

  /** 读取指定特征的数据 */
  read(index = 0) {
    return new Promise((resolve, reject) => {
      BleManager.read(
        this.peripheralId,
        this.readServiceUUID[index],
        this.readCharacteristicUUID[index],
      )
        .then(data => {
          const str = byteToString(data);
          console.log('Read', data, str);
          resolve(str);
        })
        .catch(error => {
          console.log('Read fail', error);
          reject(error);
        });
    });
  }

  /** 返回已连接的蓝牙设备 */
  getConnectedPeripherals() {
    return new Promise((resolve, reject) => {
      BleManager.getConnectedPeripherals([])
        .then(peripheralsArray => {
          console.log('Get connected peripherals', peripheralsArray);
          resolve(peripheralsArray);
        })
        .catch(error => {
          console.log('Get connected peripherals fail');
          reject(error);
        });
    });
  }

  /** 判断指定设备是否已连接 */
  isPeripheralConnected() {
    return new Promise((resolve, reject) => {
      BleManager.isPeripheralConnected(this.peripheralId, [])
        .then(isConnected => {
          resolve(isConnected);
          if (isConnected) {
            console.log('Peripheral is connected');
          } else {
            console.log('Peripheral is NOT connected');
          }
        })
        .catch(error => {
          console.log('Get peripheral is connected fail', error);
          reject(error);
        });
    });
  }

  /** 读取蓝牙接收的信号强度 */
  readRSSI(id: string) {
    return new Promise((resolve, reject) => {
      BleManager.readRSSI(id)
        .then(rssi => {
          console.log(id, 'RSSI', rssi);
          resolve(rssi);
        })
        .catch(error => {
          console.log('Read RSSI fail', error);
          reject(error);
        });
    });
  }

  /** (Android only) 打开蓝牙 */
  enableBluetooth() {
    return new Promise((resolve, reject) => {
      BleManager.enableBluetooth()
        .then(() => {
          console.log('The bluetooh is already enabled or the user confirm');
          resolve(null);
        })
        .catch(error => {
          console.log('The user refuse to enable bluetooth', error);
          reject(error);
        });
    });
  }

  /** (Android only) 获取已绑定的设备 */
  getBondedPeripherals() {
    return new Promise((resolve, reject) => {
      BleManager.getBondedPeripherals()
        .then(bondedPeripheralsArray => {
          console.log('Bonded peripherals', bondedPeripheralsArray);
          resolve(bondedPeripheralsArray);
        })
        .catch(error => {
          console.log('Bonded peripherals fail', error);
          reject(error);
        });
    });
  }

  /** (Android only) 从缓存列表中删除断开连接的外围设备。它在设备关闭时很有用，因为它会在再次打开时被重新发现 */
  removePeripheral() {
    return new Promise((resolve, reject) => {
      BleManager.removePeripheral(this.peripheralId)
        .then(() => {
          console.log('Remove peripheral success');
          resolve(null);
        })
        .catch(error => {
          console.log('Remove peripheral fail', error);
          reject(error);
        });
    });
  }
}
