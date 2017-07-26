$( document ).ready(() => {

  var WIDTH = window.innerWidth;
  var HEIGHT = window.innerHeight;

  var AUDIO_CTX = new (window.AudioContext || window.webkitAudioContext)();

  var FPS = 30;

  var canvas = document.querySelector('.canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  var canvasCtx = canvas.getContext('2d');

  var CurX = 0;
  var CurY = 0;
  var LastCurX = 0;
  var LastCurY = 0;
  var LastCurUpdate = new Date().getTime();
  var CurUpdate = new Date().getTime();

  function updateCursorPosition(e) {
    LastCurX = CurX;
    LastCurY = CurY;
    CurX = (window.Event) ? e.pageX : event.clientX + (document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft);
    CurY = (window.Event) ? e.pageY : event.clientY + (document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop);
    LastCurUpdate = CurUpdate;
    CurUpdate = new Date().getTime();
  };

  function velocity(currentPos, lastPos, curTime, lastTime) {
    return ((currentPos - lastPos) / (1 + (curTime  - lastTime))) * 5;
  }

  function NOISE_MAKER() {
    var nm = Object.create(null);

    nm.osc = AUDIO_CTX.createOscillator();
    nm.osc.type = 'square';
    nm.osc.frequency.value = 440;
    nm.osc.start();

    nm.gainNode = AUDIO_CTX.createGain();
    nm.gainNode.gain.value = 0.0;

    nm.osc.connect(nm.gainNode);
    nm.gainNode.connect(AUDIO_CTX.destination);

    nm.makeNoise = () => {
      nm.gainNode.gain.cancelScheduledValues(AUDIO_CTX.currentTime);
      nm.gainNode.gain.value = 1.0;
      nm.gainNode.gain.exponentialRampToValueAtTime(0.01, AUDIO_CTX.currentTime + 0.5);
      nm.gainNode.gain.linearRampToValueAtTime(0.0, AUDIO_CTX.currentTime + 0.6);
    };

    nm.stopNoise = () => {
      nm.gainNode.gain.value = 0.0;
    };

    return nm;
  };

  function intToHexstring(int) {
    var string = int.toString(16);
    if (string.length == 1) {
      return "0" + string;
    } else {
      return string;
    }
  }

  function hexStringToInt(hexstring) {
    return parseInt(hexstring.replace(/^#/, ''), 16);
  };

  function CIRCLE() {
    var circle = Object.create(null);

    circle.nm = NOISE_MAKER();

    circle.radius = 0;
    circle.x = 0;
    circle.y = 0;
    circle.vx = 0;
    circle.vy = 0;
    circle.is_new = true;

    circle.color_r = 255;
    circle.color_g = 0;
    circle.color_b = 0;
    circle.color = "#" + intToHexstring(circle.color_r) + intToHexstring(circle.color_g) + intToHexstring(circle.color_b);

    circle.collison_cooldown = 10;

    circle.init = (radius, x, y, vx, vy) => {
      circle.radius = radius;
      circle.x = x;
      circle.y = y;
      circle.vx = vx;
      circle.vy = vy;
      circle.created_at = new Date().getTime();
      circle.updated_at = new Date().getTime();
      circle.last_updated_at = new Date().getTime();
      return circle;
    };

    circle.set_color = (r,g,b) => {
      circle.color_r = Math.min(r, 255);
      circle.color_g = Math.min(g, 255);
      circle.color_b = Math.min(b, 255);
      circle.color = "#" + intToHexstring(r) + intToHexstring(g) + intToHexstring(b);
    };

    circle.color_vibrato = () => {
      var i = parseInt(Math.random() * 16 - 8);

      if (circle.color_r > 0) {
        circle.set_color(Math.max(1, circle.color_r + i), 0, 0);
      } else if (circle.color_g > 0) {
        circle.set_color(0, Math.max(1, circle.color_g + i), 0);
      } else if (circle.color_b > 0) {
        circle.set_color(0, 0, Math.max(1, circle.color_b + i));
      }
    };

    circle.incRadius  = () => {
      circle.radius += 1;

      f_0 = 27.50

      if (circle.radius > 120) {
        circle.nm.osc.type = 'triangle';
        circle.nm.osc.frequency.value = f_0 * Math.pow(Math.pow(2, 1/12), (61 - circle.radius % 60));

        circle.set_color(0, 0, 255);


      } else if (circle.radius > 60) {
        circle.nm.osc.type = 'sine';
        circle.nm.osc.frequency.value = f_0 * Math.pow(Math.pow(2, 1/12), (61 - circle.radius % 60));

        circle.set_color(0, 255, 0);

      } else {
        circle.nm.osc.frequency.value = f_0 * Math.pow(Math.pow(2, 1/12), (61 - circle.radius));
      }

      return circle;
    };

    circle.push = () => {
      circle.x = circle.x + circle.vx;
      circle.y = circle.y + circle.vy;
      return circle;
    };

    circle.pull = () => {
      circle.x = circle.x - circle.vx;
      circle.y = circle.y - circle.vy;
      return circle;
    }

    circle.freq = () => {
      return circle.radius;
    };

    circle.draw = (ctx) => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = circle.color;
      ctx.fill();
      ctx.stroke();
    };

    circle.collides = (circle2) => {
      var dx = circle.x - circle2.x;
      var dy = circle.y - circle2.y;
      var distance = Math.sqrt(dx  * dx + dy * dy);
      if (distance < circle.radius + circle2.radius) {
        circle.handle_collision();
        circle2.handle_collision();

        var nx = (circle2.x - circle.x) / distance;
        var ny = (circle2.y - circle.y) / distance;

        var mass1 = circle.radius;
        var mass2 = circle2.radius;

        var p = 2 * (circle.vx * nx + circle.vy * ny - circle2.vx * nx - circle2.vy * ny) / (mass1 + mass2);

        circle.pull();
        circle2.pull();

        circle.vx = circle.vx - p * mass1 * nx;
        circle.vy = circle.vy - p * mass1 * ny;
        circle2.vx = circle2.vx + p * mass2 * nx;
        circle2.vy = circle2.vy + p * mass2 * ny;
      }
    };

    circle.wall_collision = () => {
      if (circle.x - circle.radius < 0 || circle.x + circle.radius > canvas.width) {
        if (circle.x - circle.radius < 0) {
          circle.x = circle.radius;
        }
        if (circle.x + circle.radius > canvas.width) {
          circle.x = canvas.width - circle.radius
        }

        circle.vx = circle.vx * -1;
        circle.handle_collision();
      }

      if (circle.y - circle.radius < 0 || circle.y + circle.radius > canvas.height) {
        if (circle.y - circle.radius < 0) {
          circle.y = circle.radius;
        }
        if (circle.y + circle.radius > canvas.height) {
          circle.y = canvas.height - circle.radius
        }

        circle.vy = circle.vy * -1;
        circle.handle_collision();
      }
    };

    circle.handle_collision = () => {
      circle.nm.makeNoise();
    };

    circle.collision = () => {
      circle.wall_collision();

      // circles collision
      for (var c_idx in circles) {
        var c2 = circles[c_idx];
        if (c2 !== circle) {
          circle.collides(c2);
        }
      };
    };

    circle.update = () => {
      circle.color_vibrato();
      if (circle.is_new) {
        circle.last_x = circle.x;
        circle.last_y = circle.y;

        circle.x = CurX;
        circle.y = CurY;
        circle.incRadius();

        circle.last_updated_at = circle.updated_at;
        circle.updated_at = new Date().getTime();

      } else {
        circle.collision();
        circle.push();
      }
      return circle;
    };

    return circle;
  }

  var circles = []
  var newCircle = undefined;

  document.onmousedown = mouseDownEventHandler;
  document.onmouseup = mouseUpEventHandler;
  document.onmousemove = mouseMoveEventHandler;
  window.window.onresize = windowResizeEventHandler;

  function windowResizeEventHandler() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  function mouseMoveEventHandler(e) {
    updateCursorPosition(e);
  };

  function mouseDownEventHandler(e) {
    updateCursorPosition(e);
    var c = CIRCLE().init(0, CurX, CurY, 0, 0);
    newCircle = c;
    circles.push(c);
  }

  function mouseUpEventHandler(e) {
    newCircle.is_new = false;
    newCircle.vx = velocity(newCircle.x, newCircle.last_x, newCircle.updated_at, newCircle.last_updated_at);
    newCircle.vy = velocity(newCircle.y, newCircle.last_y, newCircle.updated_at, newCircle.last_updated_at);
    newCircle = undefined;
  }

  function update() {
    for (var c_idx in circles) {
      var c = circles[c_idx];
      c.update();
    }
  }

  function draw() {
    for (var c_id in circles) {
      var c = circles[c_id];
      c.draw(canvasCtx);
    }
  }

  function clearCanvas() {
    canvasCtx.globalAlpha = 0.1;
    canvasCtx.fillStyle = "#000";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.globalAlpha = 1.0;
  }

  setInterval(() => {
    update();
    clearCanvas();
    draw();
  }, 1000 / FPS);
});
