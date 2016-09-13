var _ = require('busyman'),
    Q = require('q');
var Peripheral = require('../node_modules/ble-shepherd/lib/model/peripheral');

var sensorPeriphInfo = {
        addr: '0x111111111111',
        addrType: 'public',
        connHandle: 200,
        servList: [
            {
                uuid: '0xbb00',
                handle: 1,
                startHandle: 1,
                endHandle: 10,
                charList: [
                    // illuminance
                    {
                        uuid: '0xcc05',
                        handle: 2,
                        prop: [ 'read', 'notify' ],
                        desc: null,
                        value: {
                            id: 0, 
                            flags: 1, 
                            sensorValue: 85, 
                            units: 'lux'
                        }
                    },
                    // flame
                    {
                        uuid: '0xcc04',
                        handle: 5,
                        prop: [ 'read', 'notify' ],
                        desc: null,
                        value: {
                            id: 0, 
                            flags: 128, 
                            sensorValue: false,
                            sensorType: 'flame'
                        }
                    },
                    // pir
                    {
                        uuid: '0xcc00',
                        handle: 8,
                        prop: [ 'read', 'notify' ],
                        desc: null,
                        value: { 
                            id: 0, 
                            flags: 64, 
                            dInState: false,
                            sensorType: 'pir' 
                        }
                    }                 
                ]
            }            
        ]
    },
    ctrlPeriphInfo = {
        addr: '0x222222222222',
        addrType: 'public',
        connHandle: 201,
        servList: [
            {
                uuid: '0xbb10',
                handle: 11,
                startHandle: 11,
                endHandle: 20,
                charList: [
                    // buzzer
                    {
                        uuid: '0xcc28',
                        handle: 12,
                        prop: [ 'read', 'write', 'notify' ],
                        desc: null,
                        value: { 
                            id: 0, 
                            flags: 0, 
                            onOff: false,
                            minOffTime: 0
                        }
                    },
                    // light
                    {
                        uuid: '0xcc0d',
                        handle: 15,
                        prop: [ 'read', 'write', 'notify' ],
                        desc: null,
                        value: { 
                            id: 0, 
                            flags: 0, 
                            onOff: false 
                        }
                    },
                    // switch
                    {
                        uuid: '0xcc2c',
                        handle: 18,
                        prop: [ 'read', 'notify' ],
                        desc: null,
                        value: { 
                            id: 0, 
                            flags: 0, 
                            dInState: false 
                        }
                    }
                ]
            }
        ]
    },
    weathenPeriphInfo = {
        addr: '0x333333333333',
        addrType: 'public',
        connHandle: 202,
        servList: [
            {
                uuid: '0xbb20',
                handle: 21,
                startHandle: 21,
                endHandle: 27,
                charList: [
                    // temperature
                    {
                        uuid: '0xcc07',
                        handle: 22,
                        prop: [ 'read', 'notify' ],
                        desc: null,
                        value: {
                            id: 0, 
                            flags: 1, 
                            sensorValue: 26, 
                            units: 'C'
                        }
                    },
                    //humidity
                    {
                        uuid: '0xcc08',
                        handle: 25,
                        prop: [ 'read', 'notify' ],
                        desc: null,
                        value: {
                            id: 0, 
                            flags: 1, 
                            sensorValue: 47, 
                            units: '%RH'
                        }
                    }
                ]
            }
        ]
    };

function fakeWrite (sid, cid, value, callback) {
    var self = this,
        char,
        emitMsg = {
            type: 'attChange',
            periph: self,
            data: {
                sid: {
                    uuid: null,
                    handle: null
                },
                cid: {
                    uuid: null,
                    handle: null
                },
                value: null
            }
        };

    if (_.isNil(value) || (!_.isPlainObject(value) && !Buffer.isBuffer(value))) 
        throw new TypeError('value must be an object or a buffer');

    char = self.findChar(sid, cid);
    char.value = value;

    emitMsg.data.sid.uuid = char._service.uuid;
    emitMsg.data.sid.handle = char._service.handle;
    emitMsg.data.cid.uuid = char.uuid;
    emitMsg.data.cid.handle = char.handle;
    emitMsg.data.value = char.value;

    self._central.emit('ind', emitMsg);
}

function fakeDisconnect () {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise;
}

function createPeriph (periphInfo) {
    var periph = new Peripheral(periphInfo);

    periph.status = 'online';
    periph.attatchServs(periphInfo.servList);
    periph.write = fakeWrite.bind(periph);
    periph.disconnect = fakeDisconnect.bind(periph);

    return periph;
}

module.exports = {
    sensorPeriph: createPeriph(sensorPeriphInfo),
    ctrlPeriph: createPeriph(ctrlPeriphInfo),
    weathenPeriph: createPeriph(weathenPeriphInfo)
};