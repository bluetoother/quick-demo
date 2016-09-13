# quick-demo  
A quick demo built up with [ble-shepherd](https://github.com/bluetoother/ble-shepherd)  

## Table of Contents  

1. [Overview](#Overview)    
2. [Installation](#Installation)  
3. [Usage](#Usage)  

<br />

<a name="Overview"></a>
## 1. Overview  

Here is a quick demo app that show you what [ble-shepherd](https://github.com/bluetoother/ble-shepherd) can do, e,g,. allow devices to join, control devices. You can use this quick demo as a basis to create your own BLE Web Application.

<br />

<a name="Installation"></a>
### 2. Installation  

```shell  
$ git clone https://github.com/bluetoother/quick-demo  
$ cd quick-demo  
/quick-demo $ npm install  
```

<br />

<a name="Usage"></a>
### 3. Usage  

Just need to type `npm start` in the console, server will start running.  
 
```shell
/quick-demo $ npm start
```

When you first press the `PERMIT JOIN` button, server will create a few fake peripherals, used to display some simple applications. During this period, the real peripheral device can not join the network until the end of the first permit join.  

The following figure shows the entire process from server startup to the first permit join end.  


![ble-shepherd demo](https://github.com/bluetoother/documents/blob/master/quick-demo/quick%20demo(ok).gif)  