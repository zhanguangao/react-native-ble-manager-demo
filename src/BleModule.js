/**
 * Created by guang on 2016/11/21.
 */
import {
    Platform,
    NativeModules,
    NativeEventEmitter
} from 'react-native';
import { stringToBytes,bytesToString } from 'convert-string';
import BleManager from 'react-native-ble-manager';

const BleManagerModule = NativeModules.BleManager;
//通过NativeAppEventEmitter.addListener添加监听的方法官方已不建议使用
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class BleModule{
    constructor(){
	    this.isConnecting = false;  //蓝牙是否连接
        this.bluetoothState = 'off';   //蓝牙打开状态	  
        this.initUUID();
    }

    /** 
     * 添加监听器 
     * 所有监听事件如下
     * BleManagerStopScan：扫描结束监听
     * BleManagerDiscoverPeripheral：扫描到一个新设备
     * BleManagerDidUpdateState：蓝牙状态改变
     * BleManagerDidUpdateValueForCharacteristic：接收到新数据
     * BleManagerConnectPeripheral：蓝牙设备已连接
     * BleManagerDisconnectPeripheral：蓝牙设备已断开连接
     * */
    addListener(str,fun){
        return bleManagerEmitter.addListener(str,fun);
    }

    /** 
     * 初始化蓝牙模块 
     * Init the module. 
     * */
    start(){
        BleManager.start({showAlert: false})
            .then( ()=>{
                this.checkState();
                console.log('Init the module success.');                
            }).catch(error=>{
                console.log('Init the module fail.');
            });
    }

    /** 
     * 强制检查蓝牙状态 
     * Force the module to check the state of BLE and trigger a BleManagerDidUpdateState event. 
     * */
    checkState(){
        BleManager.checkState();
    }

    /** 
     * 扫描可用设备，5秒后结束 
     * Scan for availables peripherals. 
     * */
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

    /** 
     * 停止扫描 
     * Stop the scanning. 
     * */
    stopScan() {
        BleManager.stopScan()
            .then(() => {
                console.log('Scan stopped');
            }).catch((err)=>{
	            console.log('Scan stopped fail',err);
	        });
    }

    /** 
     * 返回扫描到的蓝牙设备 
     * Return the discovered peripherals after a scan. 
     * */
    getDiscoveredPeripherals() {
        return new Promise( (resolve, reject) =>{
            BleManager.getDiscoveredPeripherals([])
                .then((peripheralsArray) => {
                    console.log('Discovered peripherals: ', peripheralsArray);
                    resolve(peripheralsArray);
                })
                .catch(error=>{

                });
        });
    }   

    /**
     * Converts UUID to full 128bit.
     * 
     * @param {UUID} uuid 16bit, 32bit or 128bit UUID.
     * @returns {UUID} 128bit UUID.
     */
    fullUUID(uuid) {
        if (uuid.length === 4){
            return '0000' + uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB'
        }             
        if (uuid.length === 8) {
            return uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB'
        }            
        return uuid.toUpperCase()
    }  

    initUUID(){
        this.readServiceUUID = [];
        this.readCharacteristicUUID = [];   
        this.writeWithResponseServiceUUID = [];
        this.writeWithResponseCharacteristicUUID = [];
        this.writeWithoutResponseServiceUUID = [];
        this.writeWithoutResponseCharacteristicUUID = [];
        this.nofityServiceUUID = [];
        this.nofityCharacteristicUUID = [];  
    }

    //获取Notify、Read、Write、WriteWithoutResponse的serviceUUID和characteristicUUID
    getUUID(peripheralInfo){       
        this.readServiceUUID = [];
        this.readCharacteristicUUID = [];   
        this.writeWithResponseServiceUUID = [];
        this.writeWithResponseCharacteristicUUID = [];
        this.writeWithoutResponseServiceUUID = [];
        this.writeWithoutResponseCharacteristicUUID = [];
        this.nofityServiceUUID = [];
        this.nofityCharacteristicUUID = [];  
        for(let item of peripheralInfo.characteristics){      
            item.service = this.fullUUID(item.service);
            item.characteristic = this.fullUUID(item.characteristic);
            if(Platform.OS == 'android'){  
                if(item.properties.Notify == 'Notify'){
                    this.nofityServiceUUID.push(item.service);
                    this.nofityCharacteristicUUID.push(item.characteristic);
                }
                if(item.properties.Read == 'Read'){
                    this.readServiceUUID.push(item.service);
                    this.readCharacteristicUUID.push(item.characteristic);
                }
                if(item.properties.Write == 'Write'){
                    this.writeWithResponseServiceUUID.push(item.service);
                    this.writeWithResponseCharacteristicUUID.push(item.characteristic);
                }
                if(item.properties.Write == 'WriteWithoutResponse'){
                    this.writeWithoutResponseServiceUUID.push(item.service);
                    this.writeWithoutResponseCharacteristicUUID.push(item.characteristic);
                }                    
            }else{  //ios
                for(let property of item.properties){
                    if(property == 'Notify'){
                        this.nofityServiceUUID.push(item.service);
                        this.nofityCharacteristicUUID.push(item.characteristic);
                    }
                    if(property == 'Read'){
                        this.readServiceUUID.push(item.service);
                        this.readCharacteristicUUID.push(item.characteristic);
                    }
                    if(property == 'Write'){
                        this.writeWithResponseServiceUUID.push(item.service);
                        this.writeWithResponseCharacteristicUUID.push(item.characteristic);
                    }
                    if(property == 'WriteWithoutResponse'){
                        this.writeWithoutResponseServiceUUID.push(item.service);
                        this.writeWithoutResponseCharacteristicUUID.push(item.characteristic);
                    }                        
                }
            }
        }
        console.log('readServiceUUID',this.readServiceUUID);
        console.log('readCharacteristicUUID',this.readCharacteristicUUID);
        console.log('writeWithResponseServiceUUID',this.writeWithResponseServiceUUID);
        console.log('writeWithResponseCharacteristicUUID',this.writeWithResponseCharacteristicUUID);
        console.log('writeWithoutResponseServiceUUID',this.writeWithoutResponseServiceUUID);
        console.log('writeWithoutResponseCharacteristicUUID',this.writeWithoutResponseCharacteristicUUID);
        console.log('nofityServiceUUID',this.nofityServiceUUID);
        console.log('nofityCharacteristicUUID',this.nofityCharacteristicUUID);  
    }

    /** 
     * 连接蓝牙  
     * Attempts to connect to a peripheral. 
     * */
    connect(id) {
        this.isConnecting = true;  //当前蓝牙正在连接中
        return new Promise( (resolve, reject) =>{
            BleManager.connect(id)
                .then(() => {
                    console.log('Connected success.');
                    return BleManager.retrieveServices(id);                    
                })
                .then((peripheralInfo)=>{
                    console.log('Connected peripheralInfo: ', peripheralInfo);                    
                    this.peripheralId = peripheralInfo.id;
                    this.getUUID(peripheralInfo);  
                    this.isConnecting = false;   //当前蓝牙连接结束  
                    resolve(peripheralInfo);
                })
                .catch(error=>{
                    console.log('Connected error:',error);
                    this.isConnecting = false;   //当前蓝牙连接结束  
                    reject(error);
                });
        });
    }

    /** 
     * 断开蓝牙连接 
     * Disconnect from a peripheral.  
     * */
    disconnect() {
	    BleManager.disconnect(this.peripheralId)
		    .then( () => {
			    console.log('Disconnected');
		    })
		    .catch( (error) => {
			    console.log('Disconnected error:',error);
		    });      
    }

    /** 
     * 打开通知  
     * Start the notification on the specified characteristic.  
     * */
    startNotification(index = 0) {
        return new Promise( (resolve, reject) =>{
            BleManager.startNotification(this.peripheralId, this.nofityServiceUUID[index], this.nofityCharacteristicUUID[index])
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

    /** 
     * 关闭通知  
     * Stop the notification on the specified characteristic. 
     * */
    stopNotification(index = 0) { 
        BleManager.stopNotification(this.peripheralId, this.nofityServiceUUID[index], this.nofityCharacteristicUUID[index])
            .then(() => {
                console.log('stopNotification success!');
                resolve();
            })
            .catch((error) => {
                console.log('stopNotification error:',error);
                reject(error);
            });
    }

	/** 
     * 写数据到蓝牙
     * 参数：(peripheralId, serviceUUID, characteristicUUID, data, maxByteSize)
     * Write with response to the specified characteristic, you need to call retrieveServices method before. 
     * */
	write(data,index = 0) {
        // data = this.addProtocol(data);        
        data = stringToBytes(data);        
        return new Promise( (resolve, reject) =>{
            BleManager.write(this.peripheralId, this.writeWithResponseServiceUUID[index], this.writeWithResponseCharacteristicUUID[index], data)
                .then(() => {
                    console.log('Write success: ',data.toString());
                    resolve();
                })
                .catch((error) => {
                    console.log('Write  failed: ',data);
                    reject(error);
                });
        });       
    }

    /** 
     * 写数据到蓝牙，没有响应 
     * 参数：(peripheralId, serviceUUID, characteristicUUID, data, maxByteSize)
     * Write without response to the specified characteristic, you need to call retrieveServices method before.  
     * */
    writeWithoutResponse(data,index = 0){
        // data = this.addProtocol(data);   
        data = stringToBytes(data);
        return new Promise( (resolve, reject) =>{
            BleManager.writeWithoutResponse(this.peripheralId, this.writeWithoutResponseServiceUUID[index], this.writeWithoutResponseCharacteristicUUID[index], data)
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
    
    /** 
     * 读取数据  
     * Read the current value of the specified characteristic, you need to call retrieveServices method before
     * */
    read(index = 0){
        return new Promise( (resolve, reject) =>{
            BleManager.read(this.peripheralId, this.readServiceUUID[index], this.readCharacteristicUUID[index])
                .then((data) => {
                    console.log('Read: ',data);                    
                    resolve(data);
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });
    }

    /** 
     * 返回已连接的蓝牙设备 
     * Return the connected peripherals. 
     * */
    getConnectedPeripherals() {
        BleManager.getConnectedPeripherals([])
            .then((peripheralsArray) => {
                console.log('Connected peripherals: ', peripheralsArray);
            }).catch(error=>{

            })
    }

     /** 
      * 判断指定设备是否已连接 
      * Check whether a specific peripheral is connected and return true or false
      */
     isPeripheralConnected(){
        return new Promise( (resolve, reject) =>{
            BleManager.isPeripheralConnected(this.peripheralId, [])
                .then((isConnected) => {
                    resolve(isConnected);
                    if (isConnected) {                        
                        console.log('Peripheral is connected!');
                    } else {
                        console.log('Peripheral is NOT connected!');
                    }
                }).catch(error=>{
                    reject(error);
                })
        });
    }

    /** 
     * 蓝牙接收的信号强度 
     * Read the current value of the RSSI 
     * */
	readRSSI() {
	    BleManager.readRSSI()
		    .then(() => {
			    console.log('Current RSSI: ' + rssi);
		    })
		    .catch((error) => {
                console.log(error);
		    });
    }

    /** 
     * 打开蓝牙(Android only) 
     * Create the request to the user to activate the bluetooth 
     * */
	enableBluetooth() {
	    BleManager.enableBluetooth()
		    .then(() => {
			    console.log('The bluetooh is already enabled or the user confirm');
		    })
		    .catch((error) => {
			    console.log('The user refuse to enable bluetooth');
		    });
    }

    /** 
     * Android only 
     * 开启一个绑定远程设备的进程  
     * Start the bonding (pairing) process with the remote device
     * */
    createBond(){
        BleManager.createBond(this.peripheralId)
            .then(() => {
                console.log('createBond success or there is already an existing one');
            })
            .catch(() => {
                console.log('fail to bond');
            })
    }

    /** 
     * Android only 
     * 获取已绑定的设备  
     * Return the bonded peripherals
     * */
    getBondedPeripherals(){
        BleManager.getBondedPeripherals([])
            .then((bondedPeripheralsArray) => {
                // Each peripheral in returned array will have id and name properties
                console.log('Bonded peripherals: ' + bondedPeripheralsArray);
            });
    }

     /**  
      * 在已绑定的缓存列表中移除设备
      * Removes a disconnected peripheral from the cached list. 
      * It is useful if the device is turned off,       
      * because it will be re-discovered upon turning on again
      * */
    removePeripheral(){
        return new Promise( (resolve, reject) =>{
            BleManager.removePeripheral(this.peripheralId)
                .then(()=>{
                    resolve();
                })
                .catch(error=>{
                    reject(error);
                })      
        });  
    }

    /** 
     * 添加蓝牙协议格式，包头、数据长度、包尾，不同的蓝牙协议应作相应的更改  
     * */
    addProtocol(data){
        return 'FEFD' + this.getHexByteLength(data) + data + 'FCFB';
    }

	/** 
     * 计算十六进制数据长度，每两位为1个长度，返回十六进制长度 
     * */
	getHexByteLength(str){
		let length = parseInt(str.length / 2);
		let hexLength = this.addZero(length.toString(16));
		return hexLength;
	}

    /** 
     * 在字符串前面添加 0, 默认补充为2位
     * */
    addZero(str, bit=2){
        for(let i = str.length; i < bit; i++){
            str = '0' + str;
        }
        return str;
    }

     /** 
      * ios系统从蓝牙广播信息中获取蓝牙MAC地址 
      * */
    getMacAddressFromIOS(data){
        let macAddressInAdvertising = data.advertising.kCBAdvDataManufacturerMacAddress;
        //为undefined代表此蓝牙广播信息里不包括Mac地址
        if(!macAddressInAdvertising){  
            return;
        }
        macAddressInAdvertising = macAddressInAdvertising.replace("<","").replace(">","").replace(" ","");
        if(macAddressInAdvertising != undefined && macAddressInAdvertising != null && macAddressInAdvertising != '') {
            macAddressInAdvertising = this.swapEndianWithColon(macAddressInAdvertising);
        }
        return macAddressInAdvertising;
    }

    /**
	 * ios从广播中获取的mac地址进行大小端格式互换，并加上冒号:
	 * @param string         010000CAEA80
	 * @returns string       80:EA:CA:00:00:01
	 * */
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