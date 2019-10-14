# React Native BLE蓝牙通信
详细使用请查看 [React Native BLE蓝牙通信](http://blog.csdn.net/withings/article/details/71378562)

<!-- 如果在项目中使用了AndroidX，在安装react-native-ble-manager或yarn install后请执行npx jetify命令 -->

注意：从Android 6.0之后，想要扫描低功率蓝牙设备，应用需要拥有访问设备位置的权限。这是因为Bluetooth beacons蓝牙信标，可用于确定手机和用户的位置。此外，在申请位置权限后，还需要打开定位服务（GPS）才能扫描到BLE设备。在小米手机上，如果没有在代码中手动申请定位权限，需要在应用权限管理中将定位改为允许才可以。

# demo截图（ios）
![搜索](https://github.com/zhanguangao/react-native-ble-manager-demo/blob/master/screenshot/scan.png?raw=true)
<br>
![已连接](https://github.com/zhanguangao/react-native-ble-manager-demo/blob/master/screenshot/connect.png?raw=true)
