'use strict';
const moment = require("moment")
const Alexa = require("alexa-sdk")

// For detailed tutorial on how to making a Alexa skill,
// please visit us at http://alexa.design/build

exports.handler = function(event, context) {
    console.log(event)
    var alexa = Alexa.handler(event, context)
    alexa.registerHandlers(handlers)
    alexa.execute()
};

let buttonCount
const handlers = {
    'LaunchRequest': function () {
        buttonCount = 0
        this.response._addDirective(button_ready)
        this.response._addDirective(buildButtonIdleAnimationDirective([], breathAnimationRed))
        delete this.handler.response.response.shouldEndSession
        this.response.speak("Welcome to Push And Go. Press first button for start and second button is stop.").listen('Press first button for start and second button is stop.')
        this.emit(':responseReady')
    },
    'HelloWorldIntent': function () {
        this.emit(':tell', 'Hello');
    },
    'SessionEndedRequest' : function() {
        console.log('Session ended with reason: ' + this.event.request.reason);
    },
    'AMAZON.StopIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent' : function() {
        this.response.speak("You can try: 'alexa, hello world' or 'alexa, ask hello world my" +
            " name is awesome Aaron'");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'Unhandled' : function() {
        this.response.speak("Sorry, I didn't get that. You can try: 'alexa, hello world'" +
            " or 'alexa, ask hello world my name is awesome Aaron'");
    },

    /* Game event handlers*/
    'GameEngine.InputHandlerEvent': function() {
      console.log('Received game event', JSON.stringify(this.event, null, 2));

      let gameEngineEvents = this.event.request.events || [];
      for (let i = 0; i < gameEngineEvents.length; i++) {
        let buttonId;
        let speech = '';
        switch (gameEngineEvents[i].name) {
          case 'all_in':
            for (let j = 0; j < gameEngineEvents[i].inputEvents.length; j++){
              buttonId = gameEngineEvents[i].inputEvents[j].gadgetId;
              console.log("Found buttonID: " + buttonId );
              if(j === 0) {
                this.response._addDirective(buildButtonIdleAnimationDirective([buttonId], breathAnimationGreen));
                this.attributes[buttonId] = {type: 'start', animation: breathAnimationGreen};
              }
              else if (j === 1) {
                this.response._addDirective(buildButtonIdleAnimationDirective([buttonId], breathAnimationRed));
                this.attributes[buttonId] = {type: 'end', animation: breathAnimationRed}
              }
            }
            this.response._addDirective(button_pressed)
            speech = 'To start dash, push green button, To finish dash, push red button.';
            this.response.speak(speech);
            delete this.handler.response.response.shouldEndSession;
            console.log(JSON.stringify(this.handler.response));
            this.emit(':responseReady');
            break;
          case 'button_down_event':
            buttonId = gameEngineEvents[i].inputEvents[0].gadgetId;
            if (this.attributes[buttonId].type == 'start' && this.attributes['start'] === undefined) {
              this.attributes['start'] = moment()
            }

            if (this.attributes[buttonId].type == 'end' && this.attributes['start'] === undefined) {
              speech = 'Press start button first.'
            }

            if (this.attributes[buttonId].type == 'end' && this.attributes['start']) {
              this.attributes['end'] = moment()
              let dur = moment().diff(this.attributes['start'])
              let sec = dur / 1000
              speech = 'Your time is ' + String(sec) + 'seconds. <prosody volume="x-loud" pitch="x-high" rate="slow">congraturations!</prosody>'
            }
            this.response.speak(speech)
            delete this.handler.response.response.shouldEndSession;
            console.log(JSON.stringify(this.handler.response));
            this.emit(':responseReady');
            break;
          case 'timeout':
            this.response.speak('')
            this.emit(':responseReady');
            break;
        }
      }
    }
}

const button_ready = {
  "type": "GameEngine.StartInputHandler",
  "timeout": 30000,
  "comment": "discover exactly two anonymous buttons, or fail",
  "proxies": [ "one", "two"],
  "recognizers": {
    "both_pressed": {
      "type": "match",
      "fuzzy": true,
      "anchor": "start",
      "pattern": [
        {
          "gadgetIds": [ "one" ],
          "action": "down"
        },
        {
          "gadgetIds": [ "two" ],
          "action": "down"
        }
      ]
    }
  },
  "events": {
    "all_in": {
      "meets": [ "both_pressed" ],
      "reports": "matches",
      "shouldEndInputHandler": false
    },
    "timeout": {
      "meets": [ "timed out" ],
      "reports": "history",
      "shouldEndInputHandler": true
    }
  }
}

const button_pressed = {
  "type": "GameEngine.StartInputHandler",
  "timeout": 30000,
  "recognizers": {
    "button_down_recognizer": {
      type: "match",
      fuzzy: false,
      anchor: "end",
      "pattern": [{
        "action": "down"
      }]
    }
  },
  "events": {
    "button_down_event": {
      "meets": ["button_down_recognizer"],
      "reports": "matches",
      "shouldEndInputHandler": false
    },
    "timeout": {
      "meets": ["timed out"],
      "reports": "history",
      "shouldEndInputHandler": true
    }
  }
}

const buildBreathAnimation = function(fromRgbHex, toRgbHex, steps, totalDuration) {
  const halfSteps = steps / 2;
  const halfTotalDuration = totalDuration / 2;
  return buildSeqentialAnimation(fromRgbHex, toRgbHex, halfSteps, halfTotalDuration)
    .concat(buildSeqentialAnimation(toRgbHex, fromRgbHex, halfSteps, halfTotalDuration));
}

const buildSeqentialAnimation = function(fromRgbHex, toRgbHex, steps, totalDuration) {
  const fromRgb = parseInt(fromRgbHex, 16);
  let fromRed = fromRgb >> 16;
  let fromGreen = (fromRgb & 0xff00) >> 8;
  let fromBlue = fromRgb & 0xff;

  const toRgb = parseInt(toRgbHex, 16);
  const toRed = toRgb >> 16;
  const toGreen = (toRgb & 0xff00) >> 8;
  const toBlue = toRgb & 0xff;

  const deltaRed = (toRed - fromRed) / steps;
  const deltaGreen = (toGreen - fromGreen) / steps;
  const deltaBlue = (toBlue - fromBlue) / steps;

  const oneStepDuration = Math.floor(totalDuration / steps);

  const result = [];

  for (let i = 0; i < steps; i++) {
    result.push({
      "durationMs": oneStepDuration,
      "color": rgb2h(fromRed, fromGreen, fromBlue),
      "intensity": 255,
      "blend": true
    });
    fromRed += deltaRed;
    fromGreen += deltaGreen;
    fromBlue += deltaBlue;
  }

  return result;
}

const rgb2h = function(r, g, b) {
  return '' + n2h(r) + n2h(g) + n2h(b);
}
// number to hex with leading zeroes
const n2h = function(n) {
  return ('00' + (Math.floor(n)).toString(16)).substr(-2);
}

const breathAnimationRed = buildBreathAnimation('552200', 'ff0000', 30, 1200)
const breathAnimationGreen = buildBreathAnimation('004411', '00ff00', 30, 1200)

// build idle animation directive
const buildButtonIdleAnimationDirective = function(targetGadgets, animation) {
  return {
    "type": "GadgetController.SetLight",
    "version": 1,
    "targetGadgets": targetGadgets,
    "parameters": {
      "animations": [{
        "repeat": 100,
        "targetLights": ["1"],
        "sequence": animation
      }],
      "triggerEvent": "none",
      "triggerEventTimeMs": 0
    }
  }
}
