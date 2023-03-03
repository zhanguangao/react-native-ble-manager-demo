/**
 * 注意：本文件下的代码是处理蓝牙协议相关的代码，需根据具体的蓝牙协议规则修改相关代码
 * 不适用于所有情况，这里是我当初项目对接蓝牙的示例代码
 *
 * 处理蓝牙协议相关的工具函数，本示例采用的蓝牙协议如下，
 * 2个16进制字符串代表8位二进制即 1 byte的数据，即FE = 11111110
 * 包数据长度 = 包命令 + Data的byte长度，1个
 * 返回数据：FEFD048D010203FCFB(16进制)
 * 分段解析：包头(FEFD) + 包数据长度(04) + 包命令(8D) + Data(010203) + 包尾(FCFB)
 */
import {Peripheral} from 'react-native-ble-manager';
import {addZero} from './utils';

// 蓝牙协议定义的包头
const BLE_HEAD = 'FEFD';
// 蓝牙协议定义的包尾
const BLE_TRAIL = 'FCFB';
/** 数据接收最大延迟时间 */
const DELAY_TIME = 300;

export default class BleProtocol {
  /** 接收到包头后，接收包尾的状态，一个完整数据包的接收状态 */
  trailStatus: boolean;
  /** 接收蓝牙数据缓存 */
  receiveData: string[];
  /** 数据接收延迟监听器 */
  receivedDelayTimer?: number;

  constructor() {
    this.trailStatus = true;
    this.receiveData = [];
  }

  /** 解析蓝牙返回的数据 */
  parseData(data: string) {
    // 某些蓝牙设备ios接收到的是小写的16进制，android接收的是大写的16进制，这里统一转化为大写的16进制
    this.receiveData.push(data.toUpperCase());

    // 将数组转换为字符串解析
    let packet = this.receiveData.join('');

    // 包命令
    let command;
    // 包数据长度
    let packetLen;

    // 接收到包头
    if (this.isHead(packet)) {
      this.trailStatus = false;
      packetLen = this.getPacketByteLen(packet);
    }

    // 接收到包尾
    if (this.isTrail(packet)) {
      // 校验数据长度：包数据长度 = 实际接收到的包长度
      if (packetLen === this.getDataByteLen(packet)) {
        // 接收到包尾
        this.trailStatus = true;
        command = this.getResponseCommand(packet);
        // 一个包接收完毕后，清空接收到的蓝牙数据缓存
        this.receiveData = [];
      }
    }

    this.receivedDelayTimer && clearTimeout(this.receivedDelayTimer);
    // 接收到包头后，如果300ms还没收到包尾的话，就丢掉这一不完整的包数据，
    // 一般100ms足够，但某些情况可能会大于100ms，为确保准备接收，这里设置300ms
    this.receivedDelayTimer = setTimeout(() => {
      if (!this.trailStatus) {
        this.receiveData = [];
      }
    }, DELAY_TIME);

    // 一个数据包在接收完毕前不进行数据处理
    if (!this.trailStatus) return;
    this.trailStatus = false;

    // 根据具体的包命令进行相应的操作
    if (command === '8D') {
      console.log('包命令: ', command);
    }
  }

  /** 判断返回的数据是否包含一个完整数据的包头 */
  isHead(str: string) {
    return str.substring(0, 4) == BLE_HEAD;
  }

  /** 判断返回的数据是否包含一个完整数据的包尾 */
  isTrail(str: string) {
    const len = str.length;
    return str.substring(len - 4, len) == BLE_TRAIL;
  }

  /** 获取返回数据的包命令 */
  getResponseCommand(str: string) {
    return str.substring(6, 8);
  }

  /** 返回一个数据包的包数据长度 */
  getPacketByteLen(str: string) {
    let hexLen = str.substring(4, 6);
    return parseInt(hexLen, 16);
  }

  /**
   * Data 实际的 Byte 长度
   * 2个16进制字符串表示1 Byte
   */
  getDataByteLen(str: string) {
    return str.substring(6, str.length - 4).length / 2;
  }

  /**
   * 添加蓝牙协议格式，包头、数据长度、包尾
   * @param string    0A
   * @returns string  FEFD010AFCFB
   */
  addProtocol(data: string) {
    return BLE_HEAD + this.getHexByteLength(data) + data + BLE_TRAIL;
  }

  /** 计算16进制数据的长度，每两位为1个长度，返回16进制格式长度 */
  getHexByteLength(str: string) {
    let length = str.length / 2;
    let hexLength = addZero(length.toString(16));
    return hexLength;
  }

  /** ios系统从蓝牙广播信息中获取蓝牙 Mac 地址 */
  getMacFromAdvertising(data: Peripheral) {
    let manufacturerData = data.advertising?.manufacturerData?.data;

    // 为空时代表此蓝牙广播信息里不包括 Mac 地址
    if (!manufacturerData) {
      return;
    }

    return this.swapEndianWithColon(manufacturerData);
  }

  /**
   * ios 从广播中获取的 Mac 地址进行大小端格式互换，并加上冒号
   * @param string         010000CAEA80
   * @returns string       80:EA:CA:00:00:01
   */
  swapEndianWithColon(str: string) {
    let format = '';
    let len = str.length;
    for (let j = 2; j <= len; j = j + 2) {
      format += str.substring(len - j, len - (j - 2));
      if (j != len) {
        format += ':';
      }
    }
    return format.toUpperCase();
  }
}
