/**
 * /**
 * 本文件代码是基于3.2.1版本写的，已弃用，没删除只是为了记录
 * 
 */
import {
    NativeAppEventEmitter,
    DeviceEventEmitter,
    Platform
} from 'react-native';

import BleManager from 'react-native-ble-manager';
export default class BleModule{
    constructor(){
	    this.isConnecting = false;  //蓝牙正在连接
	    this.bluetoothState = 'off';   //蓝牙打开状态	  
    }

    /** 添加监听器 */
    addListener(){
        //扫描结束监听 The scanning for peripherals is ended.
	    this.BleManagerStopScanListener = NativeAppEventEmitter.addListener('BleManagerStopScan', () => {
		    console.log('BleManagerStopScan:','Scanning is stopped');
	    });

	    //扫描到一个新设备The scanning find a new peripheral.
	    this.BleManagerDiscoverPeripheralListener = NativeAppEventEmitter.addListener('BleManagerDiscoverPeripheral', (data) => {
		    console.log('BleManagerDiscoverPeripheral:', data);
	    });

	    //蓝牙状态改变 The BLE change state.
	    this.BleManagerDidUpdateStateListener = NativeAppEventEmitter.addListener('BleManagerDidUpdateState', (args) => {
		    console.log('BleManagerDidUpdateStatea:', args);
	    });

	    //通知接收到蓝牙发送过来的新数据  A characteristic notify a new value.
	    this.BleManagerDidUpdateValueForCharacteristicListener = NativeAppEventEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', (data) => {
		    console.log('BleManagerDidUpdateValueForCharacteristic:', args);
	    });

	    //蓝牙设备已连接 A peripheral was connected.
	    this.BleManagerConnectPeripheralListener = NativeAppEventEmitter.addListener('BleManagerConnectPeripheral', (args) => {
		    console.log('BleManagerConnectPeripheral:', args);
	    });

	    //蓝牙设备已断开连接 A peripheral was disconnected.
	    this.BleManagerDisconnectPeripheralListener = NativeAppEventEmitter.addListener('BleManagerDisconnectPeripheral', (args) => {
		    console.log('BleManagerDisconnectPeripheral:', args);
	    });
    }

    /** 初始化蓝牙模块 Init the module. */
    start(){
        BleManager.start({showAlert: false})
            .then( ()=>{
                console.log('Init the module');
            });
    }    

    //获取通知和写数据的serviceUUID和characteristicUUID
    getUUID(peripheralInfo){
        this.nofityServiceUUID = '';
        this.nofityCharacteristicUUID = '';
        this.writeServiceUUID = '';
        this.writeCharacteristicUUID = '';
        for(let item of peripheralInfo.characteristics){
            if(JSON.stringify(item.properties) == JSON.stringify({ Notify: 'Notify' })){
                this.nofityServiceUUID = item.service;
                this.nofityCharacteristicUUID = item.characteristic;
                // console.log('Notify:',item)
            }
            if(JSON.stringify(item.properties) == JSON.stringify({ WriteWithoutResponse: 'WriteWithoutResponse' })){
                this.writeServiceUUID = item.service;
                this.writeCharacteristicUUID = item.characteristic;
                // console.log('WriteWithoutResponse:',item)
            }
        }
    }

    /** 连接蓝牙并打开通知 3.2.1版本 */
    connectAndNotify(id){        
	    this.isConnecting = true;  //当前蓝牙正在连接中
        return new Promise( (resolve, reject) =>{
            BleManager.connect(id)
                .then( (peripheralInfo) => {
                    console.log('Connected peripheralInfo: ', peripheralInfo);
	                this.peripheralId = peripheralInfo.id;
                    this.getUUID(peripheralInfo);                   
                    if(this.nofityServiceUUID.length == 4 || this.nofityServiceUUID.length != 36 ||
                        this.nofityServiceUUID == '' || this.nofityCharacteristicUUID == '' || 
                        this.writeServiceUUID == '' ||this.writeCharacteristicUUID == ''){
                            return 'invalid';
                    }
                    return BleManager.startNotification(this.peripheralId, this.nofityServiceUUID, this.nofityCharacteristicUUID)
                }).then((status) => {
                    this.isConnecting = false;   //当前蓝牙连接结束	   
                    if(status == 'invalid'){
                        console.log('Notification error');  //连接成功但不能打开通知监听            
                        // this.disconnect();  // 断开当前连接
                        reject(status);
                    }else{                                 
                        console.log('Notification started');
                        resolve();
                    }           
	            }).catch((error) => {
	                console.log('Connected and Notification error:',error);
	                this.isConnecting = false;  //当前蓝牙连接结束
	                reject(error);
	            });
        });
    }

    /** 连接蓝牙并打开通知，最新版本 */
    connectAndNotify_latest(id){        
        this.isConnecting = true;  //当前蓝牙正在连接中
        return new Promise( (resolve, reject) =>{
            BleManager.connect(id)
                .then( () => {
                    console.log('Connected');
                    return BleManager.retrieveServices(id)                  
                }).then( (peripheralInfo)=>{
                    console.log('Connected peripheralInfo: ', peripheralInfo);                    
                    this.peripheralId = peripheralInfo.id;
                    this.getUUID(peripheralInfo);                   
                    if(this.nofityServiceUUID.length == 4 || this.nofityServiceUUID.length != 36 ||
                        this.nofityServiceUUID == '' || this.nofityCharacteristicUUID == '' || 
                        this.writeServiceUUID == '' ||this.writeCharacteristicUUID == ''){
                            return 'invalid';
                    }
                    return BleManager.startNotification(this.peripheralId, this.nofityServiceUUID, this.nofityCharacteristicUUID)

                }).then((status) => {
                    this.isConnecting = false;   //当前蓝牙连接结束    
                    if(status == 'invalid'){
                        console.log('Notification error');  //连接成功但不能打开通知监听            
                        // this.disconnect();  // 断开当前连接
                        reject(status);
                    }else{                                 
                        console.log('Notification started');
                        resolve();
                    }           
                }).catch((error) => {
                    console.log('Connected and Notification error:',error);
                    this.isConnecting = false;  //当前蓝牙连接结束
                    reject(error);
                });
        });
    }


    /** 连接蓝牙  Attempts to connect to a peripheral. */
    connect(id) {
        return new Promise( (resolve, reject) =>{
            BleManager.connect(id)
                .then((peripheralInfo) => {
                    console.log('Connected peripheralInfo: ', peripheralInfo);
                    resolve(peripheralInfo);
                })
                .catch((error) => {
                    console.log('Connected error:',error);
                    reject(error);
                });
        });
    }

    /** 断开蓝牙连接 Disconnect from a peripheral.  */
    disconnect() {	  
	    BleManager.disconnect(this.peripheralId)
		    .then( () => {
			    console.log('Disconnected');
		    })
		    .catch( (error) => {
			    console.log('Disconnected error:',error);
		    });
       /* return new Promise( (resolve, reject) =>{
	        BleManager.disconnect(this.peripheralId)
	            .then( () => {
	                console.log('Disconnected');
	                resolve();
	            })
	            .catch( (error) => {
	                console.log('Disconnected error:',error);
	                reject(error);
	            });
        });*/
    }

    /** 打开通知  Start the notification on the specified characteristic.  */
    startNotification() {   //(peripheralId, serviceUUID, characteristicUUID)
        return new Promise( (resolve, reject) =>{
            BleManager.startNotification(this.peripheralId, this.nofityServiceUUID, this.nofityCharacteristicUUID)
                .then(() => {
                    console.log('Notification started');
                    resolve();
                })
                .catch((error) => {
                    console.log('Notification error:',error);
                    reject(error);
                });
        });
    }

    /** 关闭通知  Stop the notification on the specified characteristic. */
    stopNotification() {  //(peripheralId, serviceUUID, characteristicUUID)
	    return new Promise( (resolve, reject) =>{
	        BleManager.stopNotification(this.peripheralId, this.nofityServiceUUID, this.nofityCharacteristicUUID)
	            .then(() => {
	                console.log('stopNotification success!');
		            resolve();
	            })
	            .catch((error) => {
	                console.log('stopNotification error:',error);
		            reject(error);
	            });
	    });
    }

    /** 强制检查蓝牙状态 Force the module to check the state of BLE and trigger a BleManagerDidUpdateState event. */
    checkState(){
        BleManager.checkState();
    }

    /** 返回已连接的蓝牙设备 Return the connected peripherals. */
    getConnectedPeripherals() {
        BleManager.getConnectedPeripherals([])
            .then((peripheralsArray) => {
                console.log('Connected peripherals: ', peripheralsArray);
            });
    }

    /** 检测指定的蓝牙是否连接 Check whether a specific peripheral is connected and return true or false.  */
    isPeripheralConnected() {
        BleManager.isPeripheralConnected(this.state.id, [])
            .then((isConnected) => {
                if (isConnected) {
                    console.log('Peripheral is connected!');
                } else {
                    console.log('Peripheral is NOT connected!');
                }
            });
    }

    /** 返回扫描到的蓝牙设备 Return the discovered peripherals after a scan. */
    getDiscoveredPeripherals() {
        return new Promise( (resolve, reject) =>{
            BleManager.getDiscoveredPeripherals([])
                .then((peripheralsArray) => {
                    console.log('Discovered peripherals: ', peripheralsArray);
                    resolve(peripheralsArray);
                });
        });
    }

    /** 扫描可用设备 Scan for availables peripherals. */
    scan() {
        return new Promise( (resolve, reject) =>{
            BleManager.scan([], 5, true)
                .then( () => {
                    console.log('Scan started');
                    resolve();
                }).catch( (err)=>{
	                console.log('Scan started fail');
	                reject(err);
	            });
        });
    }

    /** 停止扫描 Stop the scanning. */
    stopScan() {
        BleManager.stopScan()
            .then(() => {
                console.log('Scan stopped');
            }).catch((err)=>{
	            console.log('Scan stopped fail',err);
	        });
    }

    /** 打开或关闭扫描 */
    toggleScanning(bool) {
        if (bool) {
            this.setState({scanning: true});
            this.startScan();
        } else {
            this.setState({scanning: false, ble: null})
            this.stopScan();
        }
    }

	/** 写数据到蓝牙，没有响应 Write with response to the specified characteristic. */
	write(value) {   //writeWithoutResponse(peripheralId, serviceUUID, characteristicUUID, data, maxByteSize)
		// var data = this.addProtocol(value);
		var data = value;
        return new Promise( (resolve, reject) =>{
            BleManager.writeWithoutResponse(this.peripheralId, this.writeServiceUUID, this.writeCharacteristicUUID, data)
                .then(() => {
                    console.log('Write success: ',data);
                    resolve();
                })
                .catch((error) => {
                    console.log('Write  failed: ',data);
                    reject(error);
                });
        });
		
	}

    /** 打开蓝牙(Android only) Create the request to the user to activate the bluetooth */
	enableBluetooth() {
	    BleManager.enableBluetooth()
		    .then(() => {
			    console.log('The bluetooh is already enabled or the user confirm');
		    })
		    .catch((error) => {
			    console.log('The user refuse to enable bluetooth');
		    });
    }

    /** 添加蓝牙协议格式，包头、数据长度、包尾  */
    addProtocol(data){
        return 'FEFD' + this.getHexByteLength(data) + data + 'FCFB';
    }

	/** 计算十六进制数据长度，每两位为1个长度，返回十六进制长度 */
	getHexByteLength(str){
		let length = parseInt(str.length / 2);
		let hexLength = this.addZero(length.toString(16));
		return hexLength;
	}

    /** 在字符串前面添加 0, 默认补充为2位*/
    addZero(str, bit=2){
        for(let i = str.length; i < bit; i++){
            str = '0' + str;
        }
        return str;
    }

     /** ios系统从蓝牙广播信息中获取蓝牙MAC地址 */
    getMacAddressFromIOS(data){
        let macAddressInAdvertising = data.advertising.kCBAdvDataManufacturerMacAddress;
        macAddressInAdvertising = macAddressInAdvertising.replace("<","").replace(">","").replace(" ","");
        if(macAddressInAdvertising != undefined && macAddressInAdvertising != null && macAddressInAdvertising != '') {
            macAddressInAdvertising = this.swapEndianWithColon(macAddressInAdvertising);
        }
        return macAddressInAdvertising;
    }

    /**
	 * ios从广播中获取的mac地址进行大小端格式互换，并加上冒号:
	 * @param str         010000CAEA80
	 * @returns {string}  80:EA:CA:00:00:01
	 */
	swapEndianWithColon(str){
		let format = '';
		let len = str.length;
		for(let j = 2; j <= len; j = j + 2){
			format += str.substring(len-j, len-(j-2));
			if(j != len) {
				format += ":";
			}
		}
	    return format.toUpperCase();
	}
}