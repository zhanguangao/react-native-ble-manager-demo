/** react-native-ble-manager事件 */
export enum BleEventType {
  /** 扫描结束监听 */
  BleManagerStopScan = 'BleManagerStopScan',
  /** 扫描到一个新设备 */
  BleManagerDiscoverPeripheral = 'BleManagerDiscoverPeripheral',
  /** 蓝牙状态改变 */
  BleManagerDidUpdateState = 'BleManagerDidUpdateState',
  /** 接收到新数据 */
  BleManagerDidUpdateValueForCharacteristic = 'BleManagerDidUpdateValueForCharacteristic',
  /** 蓝牙设备已连接 */
  BleManagerConnectPeripheral = 'BleManagerConnectPeripheral',
  /** 蓝牙设备已断开连接 */
  BleManagerDisconnectPeripheral = 'BleManagerDisconnectPeripheral',
  /** [iOS only] 在centralManager:WillRestoreState:被调用时触发（应用程序在后台重新启动以处理蓝牙事件） */
  BleManagerCentralManagerWillRestoreState = 'BleManagerCentralManagerWillRestoreState',
  /** [iOS only] 外围设备收到了开始或停止为指定特征值提供通知的请求 */
  BleManagerDidUpdateNotificationStateFor = 'BleManagerDidUpdateNotificationStateFor',
}

export enum BleState {
  Unknown = 'unknown', // [iOS only]
  Resetting = 'resetting', // [iOS only]
  Unsupported = 'unsupported',
  Unauthorized = 'unauthorized', // [iOS only]
  On = 'on',
  Off = 'off',
  TurningOn = 'turning_on', // [android only]
  TurningOff = 'turning_off', // [android only]
}
