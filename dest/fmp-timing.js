(function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  var START_TIME = performance && performance.timing.responseEnd;
  var IGNORE_TAG_SET = ["SCRIPT", "STYLE", "META", "HEAD", "LINK"];
  var TAG_WEIGHT_MAP = {
    SVG: 2,
    IMG: 2,
    CANVAS: 4,
    OBJECT: 4,
    EMBED: 4,
    VIDEO: 4
  };
  var LIMIT = 1000;
  var WW = window.innerWidth;
  var WH = window.innerHeight;
  var DELAY = 500;

  var FMPTiming =
  /*#__PURE__*/
  function () {
    function FMPTiming() {
      _classCallCheck(this, FMPTiming);

      this.statusCollector = [];
      this.flag = true;
      this.muo = MutationObserver;
      this.observer = null;
      this.callbackCount = 1;
      this.mp = {};
      this.initObserver();
    }

    _createClass(FMPTiming, [{
      key: "firstSnapshot",
      value: function firstSnapshot() {
        var t = window.__DOMSTART - START_TIME;
        var bodyTarget = document.body;

        if (bodyTarget) {
          this.doTag(bodyTarget, this.callbackCount++);
        }

        this.statusCollector.push({
          t: t
        });
      }
    }, {
      key: "initObserver",
      value: function initObserver() {
        var _this = this;

        this.firstSnapshot();
        this.observer = new MutationObserver(function () {
          var t = Date.now() - START_TIME;
          var bodyTarget = document.body;

          if (bodyTarget) {
            _this.doTag(bodyTarget, _this.callbackCount++);
          }

          _this.statusCollector.push({
            t: t
          });
        });
        this.observer.observe(document, {
          childList: true,
          subtree: true
        });

        if (document.readyState === "complete") {
          this.calFinallScore();
        } else {
          window.addEventListener("load", function () {
            _this.calFinallScore();
          }, true);
        }
      }
    }, {
      key: "initResourceMap",
      value: function initResourceMap() {
        var _this2 = this;

        performance.getEntries().forEach(function (item) {
          _this2.mp[item.name] = item.responseEnd;
        });
      }
    }, {
      key: "doTag",
      value: function doTag(target, callbackCount) {
        var tagName = target.tagName;

        if (IGNORE_TAG_SET.indexOf(tagName) === -1) {
          var childrenLen = target.children ? target.children.length : 0;

          if (childrenLen > 0) {
            for (var childs = target.children, i = childrenLen - 1; i >= 0; i--) {
              if (childs[i].getAttribute("f_c") === null) {
                childs[i].setAttribute("f_c", callbackCount);
              }

              this.doTag(childs[i], callbackCount);
            }
          }
        }
      }
    }, {
      key: "calFinallScore",
      value: function calFinallScore() {
        var _this3 = this;

        if (MutationObserver && this.flag) {
          if (!this.checkCanCal(START_TIME)) {
            console.time("calTime");
            this.observer.disconnect();
            this.flag = false;
            var res = this.deepTraversal(document.body);
            var tp;
            res.dpss.forEach(function (item) {
              if (tp && tp.st) {
                if (tp.st < item.st) {
                  tp = item;
                }
              } else {
                tp = item;
              }
            });
            console.log(tp, this.statusCollector);
            this.initResourceMap();
            var resultSet = this.filterTheResultSet(tp.els);
            var fmpTiming = this.calResult(resultSet);
            console.log("fmp : ", fmpTiming);
            console.timeEnd("calTime");
          } else {
            setTimeout(function () {
              _this3.calFinallScore();
            }, DELAY);
          }
        }
      }
    }, {
      key: "calResult",
      value: function calResult(resultSet) {
        var _this4 = this;

        var rt = 0;
        resultSet.forEach(function (item) {
          var t = 0;

          if (item.weight === 1) {
            var index = +item.node.getAttribute("f_c") - 1;
            t = _this4.statusCollector[index].t;
          } else if (item.weight === 2) {
            if (item.node.tagName === "IMG") {
              t = _this4.mp[item.node.src];
            } else if (item.node.tagName === "SVG") {
              var _index = +item.node.getAttribute("f_c") - 1;

              t = _this4.statusCollector[_index].t;
            } else {
              //background image
              var match = item.node.style.backgroundImage.match(/url\(\"(.*?)\"\)/);
              var s;

              if (match && match[1]) {
                s = match[1];
              }

              if (s.indexOf("http") == -1) {
                s = location.protocol + match[1];
              }

              t = _this4.mp[s];
            }
          } else if (item.weight === 4) {
            if (item.node.tagName === "CANVAS") {
              var _index2 = +item.node.getAttribute("f_c") - 1;

              t = _this4.statusCollector[_index2].t;
            } else if (item.node.tagName === "VIDEO") {
              t = _this4.mp[item.node.src];
              !t && (t = _this4.mp[item.node.poster]);
            }
          }

          console.log(t, item.node);
          rt < t && (rt = t);
        });
        return rt;
      }
    }, {
      key: "filterTheResultSet",
      value: function filterTheResultSet(els) {
        var sum = 0;
        els.forEach(function (item) {
          sum += item.st;
        });
        var avg = sum / els.length;
        return els.filter(function (item) {
          return item.st > avg;
        });
      }
    }, {
      key: "deepTraversal",
      value: function deepTraversal(node) {
        if (node) {
          var dpss = [];

          for (var i = 0, child; child = node.children[i]; i++) {
            var s = this.deepTraversal(child);

            if (s.st) {
              dpss.push(s);
            }
          }

          return this.calScore(node, dpss);
        }

        return {};
      }
    }, {
      key: "calScore",
      value: function calScore(node, dpss) {
        var _node$getBoundingClie = node.getBoundingClientRect(),
            width = _node$getBoundingClie.width,
            height = _node$getBoundingClie.height,
            left = _node$getBoundingClie.left,
            top = _node$getBoundingClie.top,
            bottom = _node$getBoundingClie.bottom,
            right = _node$getBoundingClie.right;

        var f = 1;

        if (WH < top || WW < left) {
          //不在可视viewport中
          f = 0;
        }

        var sdp = 0;
        dpss.forEach(function (item) {
          sdp += item.st;
        });
        var weight = TAG_WEIGHT_MAP[node.tagName] || 1;

        if (weight === 1 && node.style.backgroundImage && node.style.backgroundImage !== "initial") {
          weight = TAG_WEIGHT_MAP["IMG"]; //将有图片背景的普通元素 权重设置为img
        }

        var st = width * height * weight * f;
        var els = [{
          node: node,
          st: st,
          weight: weight
        }];
        var areaPercent = this.calAreaPercent(node);

        if (sdp > st * areaPercent || areaPercent === 0) {
          st = sdp;
          els = [];
          dpss.forEach(function (item) {
            els = els.concat(item.els);
          });
        }

        return {
          dpss: dpss,
          st: st,
          els: els
        };
      }
    }, {
      key: "checkCanCal",
      value: function checkCanCal(start) {
        var ti = Date.now() - start;
        return !(ti > LIMIT || ti - (this.statusCollector && this.statusCollector.length && this.statusCollector[this.statusCollector.length - 1].t || 0) > 1000);
      }
    }, {
      key: "calAreaPercent",
      value: function calAreaPercent(node) {
        var _node$getBoundingClie2 = node.getBoundingClientRect(),
            left = _node$getBoundingClie2.left,
            right = _node$getBoundingClie2.right,
            top = _node$getBoundingClie2.top,
            bottom = _node$getBoundingClie2.bottom,
            width = _node$getBoundingClie2.width,
            height = _node$getBoundingClie2.height;

        var wl = 0;
        var wt = 0;
        var wr = WW;
        var wb = WH;
        var overlapX = right - left + (wr - wl) - (Math.max(right, wr) - Math.min(left, wl));

        if (overlapX <= 0) {
          //x 轴无交点
          return 0;
        }

        var overlapY = bottom - top + (wb - wt) - (Math.max(bottom, wb) - Math.min(top, wt));

        if (overlapY <= 0) {
          return 0;
        }

        return overlapX * overlapY / (width * height);
      }
    }]);

    return FMPTiming;
  }();

  new FMPTiming();

}());
