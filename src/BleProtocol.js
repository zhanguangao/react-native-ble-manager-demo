const BLE_HEAD = "FEFD";
const BLE_TRAIL = "FCFB";

/**
 * 2个16进制字符串代表8位二进制即 1 byte的数据，即FE = 11111110
 * 包数据长度 = 包命令 + Data的byte长度，1个
 * 返回数据：FEFD048D010203FCFB(16进制)
 * 分段解析：包头(FEFD) + 包数据长度(04) + 包命令(8D) + Data(010203) + 包尾(FCFB) *
 */
export default class BleProtocol {
  constructor() {
    this.trailStatus = true; //接收到包头后，接收包尾的状态，一个完整数据包的接收状态
    this.receiveData = []; //接收蓝牙数据缓存
  }

  /** 解析蓝牙返回的数据 */
  parseData(data) {
    this.receiveData.push(data);
    let packet = this.receiveData.join(""); //将数组转换为字符串解析
    let command; //包命令

    if (isHead(packet)) {
      this.trailStatus = false; //接收到包头，等待接收包尾
      this.packetLen = this.getPacketByteLen(packet); //包数据长度
    }

    //接收到包尾
    if (isTrail(packet)) {
      //校验数据长度：包数据长度 = 实际接收到的包长度
      if (this.packetLen === this.getDataByteLen(packet)) {
        this.trailStatus = true; //接收到包尾
        command = this.getResponseCommand(packet);
        this.receiveData = []; //一个包接收完毕后，清空接收到的蓝牙数据缓存
      }
    }

    this.receivedDelayTimer && clearTimeout(this.receivedDelayTimer);
    //接收到包头后，如果300ms还没收到包尾的话，就丢掉这一不完整的包数据，
    // 一般100ms足够，但某些情况可能会大于100ms，为确保准备接收，这里设置300ms
    this.receivedDelayTimer = setTimeout(() => {
      if (!this.trailStatus) {
        this.receiveData = [];
      }
    }, 300);

    //一个数据包接收完毕前不进行数据处理
    if (!this.trailStatus) return;
    this.trailStatus = false;

    // 根据具体的包命令进行相应的操作
    if (command == "8D") {
    }
  }

  /***
   * 判断返回的数据是否包含一个完整数据的包头
   * 这里假设蓝牙协议定义的包头为FEFD
   */
  isHead(str) {
    return str.substring(0, 4) == BLE_HEAD;
  }

  /***
   * 判断返回的数据是否包含一个完整数据的包尾
   * 这里假设蓝牙协议定义的包头为FCFB
   */
  isTrail(str) {
    const len = str.length;
    return str.substring(len - 4, len) == BLE_TRAIL;
  }

  /**
   * 获取返回数据的包命令
   */
  getResponseCommand(str) {
    return str.substring(6, 8);
  }

  /**
   * 返回一个数据包的包数据长度，不包含包头和包尾
   */
  getPacketByteLen(str) {
    let hexLen = str.substring(4, 6);
    return parseInt(hexLen, 16);
  }

  /**
   * Data实际的Byte长度
   * 2个16进制字符串表示1 Byte
   */
  getDataByteLen(str) {
    return str.substring(6, str.length - 4).length / 2;
  }
  /** 在字符串前面添加 0, 默认补充为2位*/
  addZero(str, bit = 2) {
    for (let i = str.length; i < bit; i++) {
      str = "0" + str;
    }
    return str;
  }
}
