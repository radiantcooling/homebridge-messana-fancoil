var Service, Characteristic;
var request = require("request");
const defaultJSON = require('./../default.json')
const packageJSON = require('./../package.json')
const util = require('./../util.js')

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-messana-fancoil", "FancoilH", FancoilH);
  homebridge.registerAccessory("homebridge-messana-fancoil", "FancoilC", FancoilC);
};

function FancoilH(log, config, api) {
  this.apikey = util.getApiKey(api)
  this.log = log;
  this.config = config
  this.name = config.name;
  this.id = config.id
  this.model = packageJSON.models[0];
  this.apiroute = util.staticValues.apiroute
  this.temperatureDisplayUnits = 1;
  this.heatingSpeed = 55
  this.fanState = false

  this.service = new Service.Fan(this.name);
}

FancoilH.prototype = {

  identify: function(callback) {
    // this.log("Identify requested!");
    callback();
  },

  getState: function(callback) {
    // this.log("[+] getState from:", this.apiroute + defaultJSON.fancoil.apis.getState + this.id + "?apikey=" + this.apikey);

    var url = this.apiroute + defaultJSON.system.apis.getSystemOn + "?apikey=" + this.apikey;
    util.httpRequest(url, '', 'GET', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error getting System State: %s", error.message);
        callback(error);
      } else {
        try{
          var json = JSON.parse(responseBody);
        }
        catch(err){
          callback(-1);
          return
        }
        this.onSystem = (json.status == 0)? false : true
        if(!this.onSystem) {
          this.fanState = 0
          callback(null, this.fanState);
        }
        else {

          var url = this.apiroute + defaultJSON.fancoil.apis.getState + this.id + "?apikey=" + this.apikey;
          util.httpRequest(url, '', 'GET', function(error, response, responseBody) {
            if (error) {
              this.log("[!] Error getting getState: %s", error.message);
              callback(error);
            } else {
              try{
                var json = JSON.parse(responseBody);
              }
              catch(err){
                callback(-1);
                return
              }
              this.fanState = json.status;
              // this.log("[*] state: %s", this.fanState);
              callback(null, this.fanState);
            }
          }.bind(this));

        }
      }
    }.bind(this));


  },

  setState: function(value, callback) {
    // this.log("[+] setState from %s to %s", this.fanState, value);
    if(!this.onSystem){
      this.log("System OFF - Unable to change mode")
      callback();
      return
    }
    var url = this.apiroute + defaultJSON.fancoil.apis.setState + "?apikey=" + this.apikey
    var body = {
      id: this.id,
      value: (value) ? 1 : 0
    }
    util.httpRequest(url, body, 'PUT', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error setting setState", error.message);
        callback(error);
      } else {
        this.log("[*] Sucessfully set setState to %s", value);
        callback();
      }
    }.bind(this));
  },

  getHeatingSpeed: function(callback) {
    // this.log("[+] getHeatingSpeed from:", this.apiroute + defaultJSON.fancoil.apis.getHeatingSpeed + this.id + "?apikey=" + this.apikey);
    var url = this.apiroute + defaultJSON.fancoil.apis.getHeatingSpeed + this.id + "?apikey=" + this.apikey;
    util.httpRequest(url, '', 'GET', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error getting getHeatingSpeed: %s", error.message);
        callback(error);
      } else {
        try{
          var json = JSON.parse(responseBody);
        }
        catch(err){
          callback(-1);
          return
        }
        this.heatingSpeed = parseFloat(json.value);
        // this.log("[*] heatingSpeed: %s", this.heatingSpeed);
        callback(null, this.heatingSpeed);
      }
    }.bind(this));
  },

  setHeatingSpeed: function(value, callback) {
    // this.log("[+] setHeatingSpeed from %s to %s", this.heatingSpeed, value);

    this.heatingSpeed = value
    var url = this.apiroute + defaultJSON.fancoil.apis.setHeatingSpeed + "?apikey=" + this.apikey
    var body = {
      id: this.id,
      value: this.heatingSpeed
    }
    util.httpRequest(url, body, 'PUT', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error setting setHeatingSpeed", error.message);
        callback(error);
      } else {
        this.log("[*] Sucessfully set setHeatingSpeed to %s", value);
        callback();
      }
    }.bind(this));
  },

  getName: function(callback) {
    // this.log("getName :", this.name);
    callback(null, this.name);
  },

  getServices: function() {
    // this.log("***** getServices *******");
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.Manufacturer, util.staticValues.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, defaultJSON.version);

    this.service
      .getCharacteristic(Characteristic.On)
      .on('get', this.getState.bind(this))
      .on('set', this.setState.bind(this));

    this.service
      .getCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getHeatingSpeed.bind(this))
      .on('set', this.setHeatingSpeed.bind(this));

      setInterval(function() {

        this.getHeatingSpeed(function(err, temp) {
          if (err) {temp = err;}
          this.service.getCharacteristic(Characteristic.RotationSpeed).updateValue(temp);
        }.bind(this));

      }.bind(this), defaultJSON.refreshFancoil * 1000);

      setInterval(function() {

        this.getState(function(err, temp) {
          if (err) {temp = err;}
          this.service.getCharacteristic(Characteristic.On).updateValue(temp);
        }.bind(this));

      }.bind(this), defaultJSON.refreshFancoil * 300);

    return [this.informationService, this.service];
  }
};


function FancoilC(log, config, api) {
  this.apikey = util.getApiKey(api)
  this.log = log;

  this.config = config
  this.name = config.name;
  this.id = config.id
  this.model = packageJSON.models[0];

  this.apiroute = util.staticValues.apiroute
  this.temperatureDisplayUnits = 1;
  this.coolingSpeed = 55
  this.fanState = false

  this.log(this.name, this.apiroute);

  this.service = new Service.Fan(this.name);
}

FancoilC.prototype = {

  identify: function(callback) {
    // this.log("Identify requested!");
    callback();
  },

  getState: function(callback) {
    // this.log("[+] getState from:", this.apiroute + defaultJSON.fancoil.apis.getState + this.id + "?apikey=" + this.apikey);

    var url = this.apiroute + defaultJSON.system.apis.getSystemOn + "?apikey=" + this.apikey;
    util.httpRequest(url, '', 'GET', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error getting System State: %s", error.message);
        callback(error);
      } else {
        try{
          var json = JSON.parse(responseBody);
        }
        catch(err){
          callback(-1);
          return
        }
        this.onSystem = (json.status == 0)? false : true
        if(!this.onSystem) {
          this.fanState = 0
          callback(null, this.fanState);
        }
        else {

          var url = this.apiroute + defaultJSON.fancoil.apis.getState + this.id + "?apikey=" + this.apikey;
          util.httpRequest(url, '', 'GET', function(error, response, responseBody) {
            if (error) {
              this.log("[!] Error getting getState: %s", error.message);
              callback(error);
            } else {
              try{
                var json = JSON.parse(responseBody);
              }
              catch(err){
                callback(-1);
                return
              }
              this.fanState = json.status;
              // this.log("[*] state: %s", this.fanState);
              callback(null, this.fanState);
            }
          }.bind(this));

        }
      }
    }.bind(this));
  },

  setState: function(value, callback) {
    // this.log("[+] setState from %s to %s", this.fanState, value);

    this.state = value
    var url = this.apiroute + defaultJSON.fancoil.apis.setState + "?apikey=" + this.apikey
    var body = {
      id: this.id,
      value:  (value) ? 1 : 0
    }
    util.httpRequest(url, body, 'PUT', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error setting setState", error.message);
        callback(error);
      } else {
        this.log("[*] Sucessfully set setState to %s", value);
        callback();
      }
    }.bind(this));
  },

  getCoolingSpeed: function(callback) {
    var url = this.apiroute + defaultJSON.fancoil.apis.getCoolingSpeed + this.id + "?apikey=" + this.apikey;
    // this.log("[+] getCoolingSpeed from:", url);
    util.httpRequest(url, '', 'GET', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error getting getCoolingSpeed: %s", error.message);
        callback(error);
      } else {
        try{
          var json = JSON.parse(responseBody);
        }
        catch(err){
          callback(-1);
          return
        }
        this.coolingSpeed = parseFloat(json.value);
        // this.log("[*] coolingSpeed: %s", this.coolingSpeed);
        callback(null, this.coolingSpeed);
      }
    }.bind(this));
  },

  setCoolingSpeed: function(value, callback) {
    // this.log("[+] setCoolingSpeed from %s to %s", this.coolingSpeed, value);

    this.coolingSpeed = value
    var url = this.apiroute + defaultJSON.fancoil.apis.setCoolingSpeed + "?apikey=" + this.apikey
    var body = {
      id: this.id,
      value: this.coolingSpeed
    }
    util.httpRequest(url, body, 'PUT', function(error, response, responseBody) {
      if (error) {
        this.log("[!] Error setting setCoolingSpeed", error.message);
        callback(error);
      } else {
        this.log("[*] Sucessfully set setCoolingSpeed to %s", value);
        callback();
      }
    }.bind(this));
  },

  getName: function(callback) {
    // this.log("getName :", this.name);
    callback(null, this.name);
  },

  getServices: function() {
    // this.log("***** getServices *******");
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.Manufacturer, util.staticValues.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, defaultJSON.version);

    this.service
      .getCharacteristic(Characteristic.On)
      .on('get', this.getState.bind(this))
      .on('set', this.setState.bind(this));

    this.service
      .getCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getCoolingSpeed.bind(this))
      .on('set', this.setCoolingSpeed.bind(this));


    setInterval(function() {

      this.getCoolingSpeed(function(err, temp) {
        if (err) {temp = err;}
        this.service.getCharacteristic(Characteristic.RotationSpeed).updateValue(temp);
      }.bind(this));

    }.bind(this), defaultJSON.refreshFancoil * 1000);

    setInterval(function() {


      this.getState(function(err, temp) {
        if (err) {temp = err;}
        this.service.getCharacteristic(Characteristic.On).updateValue(temp);
      }.bind(this));

    }.bind(this), defaultJSON.refreshFancoil * 300);

    return [this.informationService, this.service];
  }
};
