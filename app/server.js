var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    _ = require('busyman'),
    chalk = require('chalk');

var ioServer = require('./helpers/ioServer');
var server = http.createServer();

var mockDevs = require('./dev_mock');

var options = {
        baudRate: 115200,
        rtscts: true,
        flowControl: true
    };

var BShepherd = require('ble-shepherd'),
    central = new BShepherd('noble');
    // central = new BShepherd('cc-bnp', '/dev/ttyACM0', options);

server.listen(3030);

ioServer.start(server);

function app () {
    var firstPermitJoin = true;

/**********************************/
/* show Welcome Msg               */
/**********************************/
    showWelcomeMsg();

/**********************************/
/* set Leave Msg                  */
/**********************************/
    setLeaveMsg();

/**********************************/
/* start shepherd                 */
/**********************************/
    // start your shepherd

    var dbPath = path.resolve(__dirname, '../node_modules/ble-shepherd/lib/database/ble.db');
    fs.exists(dbPath, function (isThere) {
        if (isThere) { fs.unlink(dbPath); }
    });

    central.start();

/**********************************/
/* register Req handler           */
/**********************************/
    ioServer.regReqHdlr('getDevs', function (args, cb) { 
        var devs = {};

        _.forEach(central.list(), function (devInfo) {
            devs[devInfo.addr] = cookRawDev(central.find(devInfo.addr));
        });

        cb(null, devs);
    });

    ioServer.regReqHdlr('permitJoin', function (args, cb) { 
        central.permitJoin(args.time);
        cb(null, args);

        if (firstPermitJoin) {
            firstPermitJoin = false;
            simpleApp();
        }
    });

    ioServer.regReqHdlr('write', function (args, cb) { 
        var dev = central.find(args.permAddr),
            uuids = args.auxId.split('.'),
            sid = uuids[0],
            cid = _.parseInt(uuids[2]),
            gad = dev.dump(sid, cid);

        gad.value[getGadProp(gad).valueName] = args.value;

        dev.write(sid, cid, gad.value, function (err) {
            if (err)
                cb(err);
            else
                cb(null, args.value);
        });
    });

/************************/
/* Event handle         */
/************************/
    central.on('ready', function () {
        readyInd();
    });

    /*** permitJoining    ***/
    central.on('permitJoining', function (timeLeft) {
        permitJoiningInd(timeLeft);
    });

    /*** error            ***/
    central.on('error', function (err) {
        errorInd(err.message);
    });

    central.on('ind', function (msg) {
        var dev = msg.periph;

        switch (msg.type) {
            /*** devIncoming      ***/
            case 'devIncoming':
                devIncomingInd(cookRawDev(dev));
                break;

            /*** devStatus        ***/
            case 'devStatus':
                devStatusInd(dev.addr, msg.data);
                break;

            /*** attrsChange      ***/
            case 'attChange':
                var sid = msg.data.sid,
                    cid = msg.data.cid,
                    gad = dev.dump(sid.uuid, cid.handle);
         
                valueName = getGadProp(gad).valueName;

                if (!_.isNil(valueName) && !_.isNil(msg.data.value[valueName])) 
                    attrsChangeInd(dev.addr, cookRawGad(gad, sid.uuid));
                
                break;
        }
    });
}


/**********************************/
/* welcome function               */
/**********************************/
function showWelcomeMsg() {
    var blePart1 = chalk.blue('       ___   __    ____      ____ __ __ ____ ___   __ __ ____ ___   ___ '),
        blePart2 = chalk.blue('      / _ ) / /   / __/____ / __// // // __// _ \\ / // // __// _ \\ / _ \\'),
        blePart3 = chalk.blue('     / _  |/ /__ / _/ /___/_\\ \\ / _  // _/ / ___// _  // _/ / , _// // /'),
        blePart4 = chalk.blue('    /____//____//___/     /___//_//_//___//_/   /_//_//___//_/|_|/____/ ');

    console.log('');
    console.log('');
    console.log('Welcome to ble-shepherd webapp... ');
    console.log('');
    console.log(blePart1);
    console.log(blePart2);
    console.log(blePart3);
    console.log(blePart4);
    console.log(chalk.gray('         A network server and manager for the BLE machine network'));
    console.log('');
    console.log('   >>> Author:     Hedy Wang (hedywings@gmail.com)');
    console.log('   >>> Version:    ble-shepherd v1.0.0');
    console.log('   >>> Document:   https://github.com/bluetoother/ble-shepherd');
    console.log('   >>> Copyright (c) 2016 Hedy Wang, The MIT License (MIT)');
    console.log('');
    console.log('The server is up and running, press Ctrl+C to stop server.');
    console.log('');
    console.log('---------------------------------------------------------------');
}

/**********************************/
/* goodBye function               */
/**********************************/
function setLeaveMsg() {
    process.stdin.resume();

    function stopShepherd() {
        central.stop(function () {
            process.exit(1);
        });
    }

    function showLeaveMessage() {
        console.log(' ');
        console.log(chalk.blue('      _____              __      __                  '));
        console.log(chalk.blue('     / ___/ __  ___  ___/ /____ / /  __ __ ___       '));
        console.log(chalk.blue('    / (_ // _ \\/ _ \\/ _  //___// _ \\/ // // -_)   '));
        console.log(chalk.blue('    \\___/ \\___/\\___/\\_,_/     /_.__/\\_, / \\__/ '));
        console.log(chalk.blue('                                   /___/             '));
        console.log(' ');
        console.log('    >>> This is a simple demonstration of how the shepherd works.');
        console.log('    >>> Please visit the link to know more about this project:   ');
        console.log('    >>>   ' + chalk.yellow('https://github.com/bluetoother/ble-shepherd'));
        console.log(' ');
    }

    process.on('SIGINT', stopShepherd);
    process.on('exit', showLeaveMessage);
}

/**********************************/
/* Indication funciton            */
/**********************************/
function readyInd () {
    ioServer.sendInd('ready', {});
    console.log(chalk.green('[         ready ] '));
}

function permitJoiningInd (timeLeft) {
    ioServer.sendInd('permitJoining', { timeLeft: timeLeft });
    console.log(chalk.green('[ permitJoining ] ') + timeLeft + ' sec');
}

function errorInd (msg) {
    ioServer.sendInd('error', { msg: msg });
    console.log(chalk.red('[         error ] ') + msg);
}

function devIncomingInd (dev) {
    ioServer.sendInd('devIncoming', { dev: dev });
    console.log(chalk.yellow('[   devIncoming ] ') + '@' + dev.permAddr);
}

function devStatusInd (permAddr, status) {
    ioServer.sendInd('devStatus', { permAddr: permAddr, status: status });

    if (status === 'online')
        status = chalk.green(status);
    else 
        status = chalk.red(status);

    console.log(chalk.magenta('[     devStatus ] ') + '@' + permAddr + ', ' + status);
}

function attrsChangeInd (permAddr, gad) {
    ioServer.sendInd('attrsChange', { permAddr: permAddr, gad: gad });
    console.log(chalk.blue('[   attrsChange ] ') + '@' + permAddr + ', auxId: ' + gad.auxId + ', value: ' + gad.value);
}

function toastInd (msg) {
    ioServer.sendInd('toast', { msg: msg });

}

/**********************************/
/* Cook funciton                  */
/**********************************/
function cookRawDev (dev) {
    var cooked = {
            permAddr: dev.addr,
            status: dev.status,
            gads: {}
        };

    _.forEach(dev.dump().servList, function (serv) {
        _.forEach(serv.charList, function (char) {
            var cookedGad = cookRawGad(char, serv.uuid);

            if (!_.isNil(cookedGad)) {
                cooked.gads[cookedGad.auxId] = cookedGad;
                if (dev._controller)
                    dev.configNotify(serv.uuid, char.handle, true);
            }
        });
    });

    return cooked;
}

function cookRawGad (gad, sid) {
    var cooked = {
            type: null,
            auxId: null,
            value: null
        },
        gadInfo = getGadProp(gad),
        gadValue;

    if (!gadInfo) return;

    gadValue = gad.value[gadInfo.valueName];

    if (_.isNumber(gadValue))
        gadValue = Math.round(gadValue);

    cooked.type = gadInfo.name;
    cooked.auxId = sid + '.' + gad.uuid + '.' + gad.handle;
    cooked.value = gadValue;

    return cooked;
}

function getGadProp (gad) {
    var prop = {
            name: null,
            valueName: null
        };

    switch (gad.uuid) {
        case '0xcc00':
            // if (gad.value)
            prop.name = 'Pir';
            prop.valueName = 'dInState';
            break;
        case '0xcc05':
            if (gad.value.units !== 'lux')
                return;

            prop.name = 'Illuminance';
            prop.valueName = 'sensorValue';
            break;
        case '0xcc07':
            prop.name = 'Temperature';
            prop.valueName = 'sensorValue';
            break;
        case '0xcc08':
            prop.name = 'Humidity';
            prop.valueName = 'sensorValue';
            break;
        case '0xcc0d':
            prop.name = 'Light';
            prop.valueName = 'onOff';
            break;
        case '0xcc28':
            prop.name = 'Buzzer';
            prop.valueName = 'onOff';
            break;
        case '0xcc2c':
            prop.name = 'Switch';
            prop.valueName = 'dInState';
            break;
        case '0xcc04':
            if (gad.value.sensorType !== 'flame')
                return;

            prop.name = 'Flame';
            prop.valueName = 'sensorValue';
            break;
        default:
            return;
    }

    return prop;
}

/**********************************/
/* Simple Application             */
/**********************************/
function simpleApp () {
    var sensorPeriph = mockDevs.sensorPeriph,
        ctrlPeriph = mockDevs.ctrlPeriph,
        weathenPeriph = mockDevs.weathenPeriph;

    sensorPeriph._central = ctrlPeriph._central = weathenPeriph._central = central;

    central.blocker.enable('white');

    central.regPeriph(sensorPeriph);
    central.regPeriph(ctrlPeriph);
    central.regPeriph(weathenPeriph);

    setTimeout(function () {
        toastInd('Device ' + weathenPeriph.addr + ' will join the network');

        setTimeout(function () {
            central.emit('ind', { type: 'devIncoming', periph: weathenPeriph });
        }, 3000);

        setInterval(function () {
            var tempVal = 25 + Math.random() * 5,
                humidVal = 40 + Math.random() * 10;

            attChangeInd(weathenPeriph, '0xbb20', '0xcc07', tempVal);
            attChangeInd(weathenPeriph, '0xbb20', '0xcc08', humidVal);
        }, 3000);
    }, 100);

    setTimeout(function () {
        toastInd('Device ' + sensorPeriph.addr + ' will join the network');

        setTimeout(function () {
            central.emit('ind', { type: 'devIncoming', periph: sensorPeriph });
        }, 3000);
    }, 3500);

    setTimeout(function () {
        toastInd('Device ' + ctrlPeriph.addr + ' will join the network');

        setTimeout(function () {
            central.emit('ind', { type: 'devIncoming', periph: ctrlPeriph });
        }, 3000);
    }, 7000);

    setTimeout(function () {
        toastInd('You can click on a lamp or a buzzer');
    }, 11000);

    setTimeout(function () {
        toastInd('User will turn on the light switch');

        // turn on the light switch
        setTimeout(function () {
            attChangeInd(ctrlPeriph, '0xbb10', '0xcc2c', true);
        }, 4000);

        // turn on the light
        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc0d', true);
        }, 4300);

        setTimeout(function () {
            toastInd('User will turn off the light switch');
        }, 6500);

        // turn off the light switch
        setTimeout(function () {
            attChangeInd(ctrlPeriph, '0xbb10', '0xcc2c', false);
        }, 10500);

        // turn off the light
        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc0d', false);
        }, 11000);
    }, 17000);

    setTimeout(function () {
        toastInd('Illumination is less than 50 lux, light would be turned on');

        setTimeout(function () {
            attChangeInd(sensorPeriph, '0xbb00', '0xcc05', 40);
        }, 4500);

        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc0d', true);
        }, 4800);

        setTimeout(function () {
            toastInd('Illumination is greater than 50 lux, light would be turned off');
        }, 6000);

        setTimeout(function () {
            attChangeInd(sensorPeriph, '0xbb00', '0xcc05', 58);
        }, 10500);

        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc0d', false);
        }, 10800);

        setTimeout(function () {
            attChangeInd(sensorPeriph, '0xbb00', '0xcc05', 66);
        }, 12000);
    }, 29000);

    setTimeout(function () {
        toastInd('PIR sensed someone walking around, light would be turned on');

        setTimeout(function () {
            attChangeInd(sensorPeriph, '0xbb00', '0xcc00', true);
        }, 5000);

        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc0d', true);
        }, 5300);

        setTimeout(function () {
            attChangeInd(sensorPeriph, '0xbb00', '0xcc00', false);
        }, 9500);

        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc0d', false);
        }, 10500);
    }, 41000);

    setTimeout(function () {
        toastInd('Flame sensor detect the presence of a flame or fire, buzzer would be turned on');

        setTimeout(function () {
            attChangeInd(sensorPeriph, '0xbb00', '0xcc04', true);
        }, 5000);

        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc28', true);
        }, 5300);

        setTimeout(function () {
            attChangeInd(sensorPeriph, '0xbb00', '0xcc04', false);
        }, 9500);

        setTimeout(function () {
            toggleDev(ctrlPeriph, '0xbb10', '0xcc28', false);
        }, 10500);
    }, 53000);

    setTimeout(function () {
        central.blocker.disable();
    }, 65000);
}

function toggleDev (periph, sid, cid, onOff) {
    var periphValue = periph.dump(sid, cid).value;

    periphValue.onOff = onOff;
    periph.write(sid, cid, periphValue);
}

function attChangeInd (periph, suuid, cuuid, value) {
    var emitMsg = { 
            type: 'attChange', 
            periph: periph, 
            data: {} 
        },
        sid = { uuid: suuid, handle: null },
        cid = { uuid: cuuid, handle: null },
        emitValue = {},
        gad = periph.dump(suuid, cuuid),
        gadInfo = getGadProp(gad);

    sid.handle = periph.dump(suuid).handle;
    cid.handle = gad.handle;
    emitValue[gadInfo.valueName] = value;

    emitMsg.data = { sid: sid, cid: cid, value: emitValue };

    periph.servs[sid.handle].chars[cid.handle].value[gadInfo.valueName] = value;
    central.emit('ind', emitMsg);
}

module.exports = app;
