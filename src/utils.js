const utils = {
  //获取当前样式
  getStyle(element, att) {
    //特性侦测
    if (window.getComputedStyle) {
      //优先使用W3C规范
      return window.getComputedStyle(element)[att];
    } else {
      //针对IE9以下兼容
      return element.currentStyle[att];
    }
  }
}

export default utils;