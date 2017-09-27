import React, { Component } from 'react'
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    ScrollView,
    Platform,
    NativeAppEventEmitter,
    TextInput,
    Dimensions,
} from 'react-native'
import BleManager from './BleManager';
global.BluetoothManager = new BleManager();  //确保全局只有一个BleManager实例

export default class App extends Component {
    constructor(props) {
        super(props);   
        this.state={
            data: [],
            scaning:false,
            isConnected:false,
            text:'',
            sendData:'',
            receiveData:'',
        }
        this.bluetoothRreceiveData = [];  //蓝牙接收的数据缓存
        this.deviceList = [];     
        this.deviceMap = new Map();  
    }

    componentWillMount(){
        BluetoothManager.start()  //初始化         
	    //蓝牙状态改变 The BLE change state.
	    this.BleManagerDidUpdateStateListener = NativeAppEventEmitter.addListener('BleManagerDidUpdateState', (args) => {
            console.log('BleManagerDidUpdateStatea:', args);
            BluetoothManager.bluetoothState = args.state;  
            if(args.state == 'on'){  //蓝牙打开时自动搜索
                this.scan();
            }            
	    });

	    //通知接收到蓝牙发送过来的新数据  A characteristic notify a new value.
	    this.BleManagerDidUpdateValueForCharacteristicListener = NativeAppEventEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', (data) => {
             //ios接收到的是小写的16进制，android接收的是大写的16进制，统一转化为大写16进制
            let value = data.value.toUpperCase();	
            this.bluetoothRreceiveData.push(value);			
            console.log('BluetoothUpdateValue', value);
            this.setState({receiveData:this.bluetoothRreceiveData.join('')})
	    });

	    //蓝牙设备已连接 A peripheral was connected.
	    this.BleManagerConnectPeripheralListener = NativeAppEventEmitter.addListener('BleManagerConnectPeripheral', (args) => {
		    console.log('BleManagerConnectPeripheral:', args);           
	    });

	    //蓝牙设备已断开连接 A peripheral was disconnected.
	    this.BleManagerDisconnectPeripheralListener = NativeAppEventEmitter.addListener('BleManagerDisconnectPeripheral', (args) => {
		    console.log('BleManagerDisconnectPeripheral:', args);
            this.setState({isConnected:false});
	    });

        //搜索到一个新设备监听
        NativeAppEventEmitter.addListener('BleManagerDiscoverPeripheral', (data) => {
            // console.log('BleManagerDiscoverPeripheral:', data);
            console.log(data.id,data.name);
            let id;  //蓝牙连接id
            let macAddress;  //蓝牙Mac地址            
            if(Platform.OS == 'android'){
                macAddress = data.id;
                id = macAddress;
            }else{  //ios通过广播0x18获取蓝牙Mac地址，如果广播携带有Mac地址
                macAddress = BluetoothManager.getMacAddressFromIOS(data);
                id = data.id;
            } 
            this.deviceMap.set(data.id,data);  //使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备
            this.setState({data:[...this.deviceMap.values()]});               
  
        });

        //扫描结束监听 The scanning for peripherals is ended.
	    this.BleManagerStopScanListener = NativeAppEventEmitter.addListener('BleManagerStopScan', () => {
		    console.log('BleManagerStopScan:','Scanning is stopped');
            this.setState({scaning:false});
	    });	    
    }   

    componentWillUnmount(){
        if(this.state.isConnected){
            BluetoothManager.disconnect();  //退出时断开蓝牙连接
        }
    }

    connect(item){
        //当前蓝牙正在连接时不能打开另一个连接进程
        if(BluetoothManager.isConnecting){
            console.log('当前蓝牙正在连接时不能打开另一个连接进程');
            return;
        }
        if(this.state.scaning){  //当前正在扫描中，连接时关闭扫描
            BluetoothManager.stopScan();
            this.setState({scaning:false});
        }
        let newData = [...this.deviceMap.values()]
        newData[item.index].isConnecting = true;       
        this.setState({data:newData});
        
        BluetoothManager.connectAndNotify(item.item.id)
            .then(()=>{
                this.setState({isConnected:true});
                newData[index].isConnecting = false;
                this.setState({data:item.item});
            })
            .catch(err=>{
                let newData = [...this.deviceMap.values()]
                newData[item.index].isConnecting = false;                
                this.setState({data:newData});
                alert('连接失败');
            })
    } 

    disconnect(){
        this.setState({isConnected:false});
        this.setState({data:[...this.deviceMap.values()]});
        BluetoothManager.disconnect();
    }   

    scan(){
        if(BluetoothManager.bluetoothState == 'on'){
            BluetoothManager.scan()
                .then(()=>{
                    this.setState({ scaning:true });
                }).catch(err=>{

                })
        }else{
            alert('请打开手机蓝牙后再搜索');
        }       
    }

    send(){        
        if(this.state.text.length == 0){
            alert('请输入消息');
            return;
        }
        BluetoothManager.write(this.state.text)
            .then(()=>{
                this.bluetoothRreceiveData = [];
                this.setState({receiveData:''});
                this.setState({
                    sendData:this.state.text,
                    text:''
                })
            })
            .catch(err=>{
                alert('发送失败');
            })        
    }

    renderItem=(item)=>{
        let data = item.item;
        return(
            <TouchableOpacity
                activeOpacity={0.7}
                disabled={this.state.isConnected?true:false}
                onPress={()=>{this.connect(item)}}
                style={styles.listRow}>          
                <Text style={{color:'black'}}>{data.name?data.name:'未知设备'}</Text>
                <View style={{flexDirection:'row',}}>
                    <Text>{data.id}</Text>
                    <Text style={{marginLeft:100,color:"red"}}>{data.isConnecting?'连接中...':''}</Text>
                </View>
               
            </TouchableOpacity>
        );
    }

    render () {
        return (
            <View style={styles.container}>  
               
                <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={this.state.isConnected?this.disconnect.bind(this):this.scan.bind(this)}>
                    <View style={[styles.buttonView,styles.center]}>
                        <Text style={styles.buttonText}>{this.state.scaning?'正在搜索中':this.state.isConnected?'断开蓝牙':'搜索蓝牙'}</Text>
                    </View>      
                </TouchableOpacity>
                
                <Text style={{marginLeft:10,marginTop:10}}>
                    {this.state.isConnected?'当前连接的设备':'可用设备'}
                </Text>
                
                <FlatList 
                    renderItem={this.renderItem}
                    keyExtractor={item=>item.id}
                    data={this.state.data}
                />          
                {this.state.isConnected?
                    <View style={{}}>
                        <Text style={{marginLeft:10,color:'black'}}>发送的数据：</Text>
                        <Text style={styles.content}>
                            {this.state.sendData}
                        </Text>
                        
                        <Text style={{marginLeft:10,marginTop:50,color:'black'}}>接收的数据：</Text>
                        <Text style={styles.content}>
                            {this.state.receiveData}
                        </Text>
                        <View style={{flexDirection:'row',marginTop:50}}>
                            <TextInput
                                style={[styles.textInput]}
                                value={this.state.text}
                                placeholder='消息'
                                onChangeText={(text)=>{
                                    this.setState({text:text});
                                }}
                            />                
                            <TouchableOpacity 
                                activeOpacity={0.7}
                                style={styles.sendButton}
                                onPress={this.send.bind(this)}>
                                <View style={[styles.buttonView,styles.center]}>
                                    <Text style={styles.buttonText}>发送</Text>
                                </View>      
                            </TouchableOpacity>
                        </View>
                    </View>
                    : <View></View>
                }        
            </View>
        )
    }
}

const styles = StyleSheet.create({
    content:{
        paddingHorizontal:10,
        marginTop:5,
    },
    container: {
        flex: 1,
        backgroundColor:'white',
        marginTop:Platform.OS == 'ios'?20:0,
    },
    listRow:{
        flexDirection:'column',
        borderColor:'rgb(235,235,235)',
        borderStyle:'solid',
        borderBottomWidth:1,
        paddingLeft:10,
        paddingVertical:8,       
    },
    listview:{
        marginTop:10,
        marginBottom:30,
    },
    listStyle:{
        borderColor:'rgb(235,235,235)',
        borderStyle:'solid',
        borderTopWidth:1,
        marginLeft:10,
        marginRight:10,
    },
    center:{
        alignItems:"center",
        justifyContent:"center",        
    },
    buttonView:{
        paddingVertical:10,
        backgroundColor:'rgb(33, 150, 243)',
        marginHorizontal:10,
        marginTop:10,
        borderRadius:5,
    },
    buttonText:{
        color:"white"
    },
    textInput:{
		margin:10,
		paddingLeft:5,
		paddingRight:5,
		backgroundColor:'white',
		height:50,
		fontSize:16,
        width:Dimensions.get('window').width - 100,
	},
    sendButton:{
        width:80,
        marginTop:5,
    }
})


