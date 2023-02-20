// 导入常量、locale和工具函数
import * as C from './constant'
import en from './locale/en'
import U from './utils'


let L = 'en'
const Ls = {}
Ls[L] = en // Ls存放的就是locale对象

// 1、d._proto_ = Dayjs.prototype: 判断值是否是Dayjs类的实例
const isDayjs = d => d instanceof Dayjs
// 2、返回对应语言环境标识：默认为'en'
const parseLocale = (preset, object, isLocal) => {
  let l
  if (!preset) return L // 默认返回'en'
  if (typeof preset === 'string') {
    const presetLower = preset.toLowerCase()
    if (Ls[presetLower]) { // Ls.[zh-cn]
      l = presetLower // zh-cn
    }
    if (object) {
      Ls[presetLower] = object
      l = presetLower
    }
    const presetSplit = preset.split('-')
    if (!l && presetSplit.length > 1) {
      return parseLocale(presetSplit[0]) // parseLocale('zh')
    }
  } else {
    const { name } = preset
    Ls[name] = preset
    l = name
  }
  if (!isLocal && l) L = l
  return l || (!isLocal && L)
}
// 3、返回Dayjs实例
const dayjs = function (date, c) {
  if (isDayjs(date)) {
    return date.clone()
  }
  // dayjs(new Date()).format('MMDD')
  const cfg = typeof c === 'object' ? c : {}
  cfg.date = date
  cfg.args = arguments
  return new Dayjs(cfg) // {date: new Date(), args: [...]}
}
// 4、封装新实例(暂时不明白作用)
const wrapper = (date, instance) =>
  dayjs(date, {
    locale: instance.$L,
    utc: instance.$u,
    x: instance.$x,
    $offset: instance.$offset
})
// 把几个工具方法同样加到Utils工具包中(没有统一放到utils原因是因为用到了 index.js 作用域中的一些变量)
const Utils = U
Utils.i = isDayjs
Utils.l = parseLocale
Utils.w = wrapper

// 5、返回Date实例
const parseDate = (cfg) => {
  const { date, utc } = cfg
  if (date === null) return new Date(NaN) // date为null时
  if (date === undefined) return new Date() // date为undefined时
  if (date instanceof Date) return new Date(date)
  if (typeof date === 'string' && !/Z$/i.test(date)) {
    const d = date.match(C.REGEX_PARSE)
    if (d) {
      const m = d[2] - 1 || 0
      const ms = (d[7] || '0').substring(0, 3)
      if (utc) {
        return new Date(Date.UTC(d[1], m, d[3]
          || 1, d[4] || 0, d[5] || 0, d[6] || 0, ms))
      }
      return new Date(d[1], m, d[3]
          || 1, d[4] || 0, d[5] || 0, d[6] || 0, ms)
    }
  }

  return new Date(date)
}

class Dayjs {
  constructor(cfg) {
    this.$L = parseLocale(cfg.locale, null, true)
    this.parse(cfg) // for plugin
  }

  // 01、初始化
  parse(cfg) {
    this.$d = parseDate(cfg)
    this.$x = cfg.x || {}
    this.init()
  }
  init() {
    const { $d } = this
    this.$y = $d.getFullYear()
    this.$M = $d.getMonth()
    this.$D = $d.getDate()
    this.$W = $d.getDay()
    this.$H = $d.getHours()
    this.$m = $d.getMinutes()
    this.$s = $d.getSeconds()
    this.$ms = $d.getMilliseconds()
  }

  // 02、取赋值
  set(string, int) {
    return this.clone().$set(string, int)
  }
  get(unit) {
    return this[Utils.p(unit)]() // this.month()
  }

  // 03、操作
  add(number, units) { // 加
    number = Number(number)
    const unit = Utils.p(units)
    const instanceFactorySet = (n) => {
      const d = dayjs(this)
      return Utils.w(d.date(d.date() + Math.round(n * number)), this)
    }
    // 不同的类型使用方法不一致的原因
    if (unit === C.M) {
      return this.set(C.M, this.$M + number) // Utils.w(this.$d, this).$set('month', 2)
    }
    if (unit === C.Y) {
      return this.set(C.Y, this.$y + number)
    }
    if (unit === C.D) {
      return instanceFactorySet(1)
    }
    if (unit === C.W) {
      return instanceFactorySet(7)
    }
    const step = {
      [C.MIN]: C.MILLISECONDS_A_MINUTE,
      [C.H]: C.MILLISECONDS_A_HOUR,
      [C.S]: C.MILLISECONDS_A_SECOND
    }[unit] || 1 // step.hour、step.minute、step.second

    const nextTimeStamp = this.$d.getTime() + (number * step)
    return Utils.w(nextTimeStamp, this)
  }
  subtract(number, string) { // 减
    return this.add(number * -1, string) // 以后可借鉴此种写法
  }
  startOf(units, startOf) { // 时间的开始：如startOf('month') 2023-02-01:00:00:00
    const isStartOf = !Utils.u(startOf) ? startOf : true
    const unit = Utils.p(units)
    const instanceFactory = (d, m) => {
      const ins = Utils.w(this.$u ?
        Date.UTC(this.$y, m, d) : new Date(this.$y, m, d), this)
      return isStartOf ? ins : ins.endOf(C.D)
    }
    const instanceFactorySet = (method, slice) => {
      const argumentStart = [0, 0, 0, 0]
      const argumentEnd = [23, 59, 59, 999]
      return Utils.w(this.toDate()[method].apply( // eslint-disable-line prefer-spread
        this.toDate('s'),
        (isStartOf ? argumentStart : argumentEnd).slice(slice)
      ), this)
    }
    const { $W, $M, $D } = this
    const utcPad = `set${this.$u ? 'UTC' : ''}`
    switch (unit) {
      case C.Y:
        return isStartOf ? instanceFactory(1, 0) :
          instanceFactory(31, 11)
      case C.M:
        return isStartOf ? instanceFactory(1, $M) :
          instanceFactory(0, $M + 1)
      case C.W: {
        const weekStart = this.$locale().weekStart || 0
        const gap = ($W < weekStart ? $W + 7 : $W) - weekStart
        return instanceFactory(isStartOf ? $D - gap : $D + (6 - gap), $M)
      }
      case C.D:
      case C.DATE:
        return instanceFactorySet(`${utcPad}Hours`, 0)
      case C.H:
        return instanceFactorySet(`${utcPad}Minutes`, 1)
      case C.MIN:
        return instanceFactorySet(`${utcPad}Seconds`, 2)
      case C.S:
        return instanceFactorySet(`${utcPad}Milliseconds`, 3)
      default:
        return this.clone()
    }
  }
  endOf(arg) { // 时间的结束：如endOf('month') 2023-02-28:23:59:59
    return this.startOf(arg, false)
  }
  utcOffset() {
    // Because a bug at FF24, we're rounding the timezone offset around 15 minutes
    // https://github.com/moment/moment/pull/1871
    return -Math.round(this.$d.getTimezoneOffset() / 15) * 15
  }

  // 04、显示
  format(formatStr) {
    const locale = this.$locale()

    if (!this.isValid()) return locale.invalidDate || C.INVALID_DATE_STRING

    const str = formatStr || C.FORMAT_DEFAULT
    const zoneStr = Utils.z(this)
    const { $H, $m, $M } = this
    const {
      weekdays, months, meridiem
    } = locale
    const getShort = (arr, index, full, length) => (
      (arr && (arr[index] || arr(this, str))) || full[index].slice(0, length)
    )
    const get$H = num => (
      Utils.s($H % 12 || 12, num, '0')
    )

    const meridiemFunc = meridiem || ((hour, minute, isLowercase) => {
      const m = (hour < 12 ? 'AM' : 'PM')
      return isLowercase ? m.toLowerCase() : m
    })
    
    // 2022-02-07
    const matches = {
      YY: String(this.$y).slice(-2), // 23
      YYYY: this.$y, // 2023
      M: $M + 1, // 2
      MM: Utils.s($M + 1, 2, '0'), // 02
      MMM: getShort(locale.monthsShort, $M, months, 3),
      MMMM: getShort(months, $M),
      D: this.$D,
      DD: Utils.s(this.$D, 2, '0'), // 07
      d: String(this.$W), // 2 (一周的第2天)
      dd: getShort(locale.weekdaysMin, this.$W, weekdays, 2),
      ddd: getShort(locale.weekdaysShort, this.$W, weekdays, 3),
      dddd: weekdays[this.$W], // Tuesday
      H: String($H), // 18
      HH: Utils.s($H, 2, '0'), // 18
      h: get$H(1),
      hh: get$H(2),
      a: meridiemFunc($H, $m, true),
      A: meridiemFunc($H, $m, false),
      m: String($m), // 36
      mm: Utils.s($m, 2, '0'), // 36
      s: String(this.$s), // 10
      ss: Utils.s(this.$s, 2, '0'), // 10
      SSS: Utils.s(this.$ms, 3, '0'),
      Z: zoneStr
    }
    // $1相匹配的第一个文本, 如'MM~DD'.replace() ==> 找到MM则将对应位置替换为matches['MM'], ~找不到，继续匹配DD, 找到将对应位置替换为matches['DD']
    return str.replace(C.REGEX_FORMAT, (match, $1) => $1 || matches[match] || zoneStr.replace(':', '')) // 'ZZ'
  }
  toDate() {
    return new Date(this.valueOf())
  }
  // toJSON与toISOString几乎一致
  toJSON() {
    return this.isValid() ? this.toISOString() : null
  }
  // '2019-01-25T02:00:00.000Z'
  toISOString() {
    return this.$d.toISOString()
  }
  // 'Fri, 25 Jan 2019 02:00:00 GMT'
  toString() {
    return this.$d.toUTCString()
  }

  // 05、查询
  isValid() {
    return !(this.$d.toString() === C.INVALID_DATE_STRING)
  }
  isSame(that, units) {
    const other = dayjs(that)
    return this.startOf(units) <= other && other <= this.endOf(units)
  }
  isAfter(that, units) {
    return dayjs(that) < this.startOf(units)
  }
  // 与当前时间比较、与当前时间当月最后一天比较：2023-02-28:23:59:59、与当前时间当年最后一月比较：2023-12-31 23:59:59
  isBefore(that, units) {
    return this.endOf(units) < dayjs(that) // endOf('month) => 2023-02-28:23:59:59 < 2023/02/17 ==> false
  }
  // 获取当前月份包含的天数
  daysInMonth() {
    return this.endOf('month').$D
  }
  diff(input, units, float) {
    const unit = Utils.p(units)
    const that = dayjs(input)
    const zoneDelta = (that.utcOffset() - this.utcOffset()) * C.MILLISECONDS_A_MINUTE
    const diff = this - that
    let result = Utils.m(this, that)

    result = {
      [C.Y]: result / 12,
      [C.M]: result,
      [C.Q]: result / 3,
      [C.W]: (diff - zoneDelta) / C.MILLISECONDS_A_WEEK,
      [C.D]: (diff - zoneDelta) / C.MILLISECONDS_A_DAY,
      [C.H]: diff / C.MILLISECONDS_A_HOUR,
      [C.MIN]: diff / C.MILLISECONDS_A_MINUTE,
      [C.S]: diff / C.MILLISECONDS_A_SECOND
    }[unit] || diff // milliseconds

    return float ? result : Utils.a(result)
  }
  unix() {
    return Math.floor(this.valueOf() / 1000)
  }
  valueOf() {
    // timezone(hour) * 60 * 60 * 1000 => ms
    return this.$d.getTime()
  }
  
  // 06、其他
  clone() {
    // 克隆，返回新的Dayjs的实例
    return Utils.w(this.$d, this)
  }
  $utils() {
    return Utils
  }
  $g(input, get, set) {
    // 无参数就get, 有参数就set
    if (Utils.u(input)) return this[get] // this.$s
    return this.set(set, input)
  }
  $set(units, int) { // private set
    const unit = Utils.p(units)
    const utcPad = `set${this.$u ? 'UTC' : ''}`
    const name = {
      [C.D]: `${utcPad}Date`,
      [C.DATE]: `${utcPad}Date`,
      [C.M]: `${utcPad}Month`,
      [C.Y]: `${utcPad}FullYear`,
      [C.H]: `${utcPad}Hours`,
      [C.MIN]: `${utcPad}Minutes`,
      [C.S]: `${utcPad}Seconds`,
      [C.MS]: `${utcPad}Milliseconds`
    }[unit]
    const arg = unit === C.D ? this.$D + (int - this.$W) : int // 单位为day处理

    if (unit === C.M || unit === C.Y) {
      // clone is for badMutable plugin
      const date = this.clone().set(C.DATE, 1)
      date.$d[name](arg)
      date.init()
      this.$d = date.set(C.DATE, Math.min(this.$D, date.daysInMonth())).$d
    } else if (name) this.$d[name](arg)

    this.init()
    return this
  }
  $locale() {
    return Ls[this.$L]
  }
  locale(preset, object) {
    if (!preset) return this.$L
    const that = this.clone()
    const nextLocaleName = parseLocale(preset, object, true)
    if (nextLocaleName) that.$L = nextLocaleName
    return that
  }
}

// 6、在prototype上设置各单位的取值和设置值函数
const proto = Dayjs.prototype
dayjs.prototype = proto;
[
  ['$ms', 'millisecond'], // dayjs.prototype.millisecond
  ['$s', 'second'], // day.prototype.second
  ['$m', 'minute'],
  ['$H', 'hour'],
  ['$W', 'day'],
  ['$M', 'month'],
  ['$y', 'year'],
  ['$D', 'date']
].forEach((item) => {
  proto[item[1]] = function (input) {
    return this.$g(input, item[0], item[1])
  }
  // 这几个方法都是不传参数就是get, 传参数就是set。如：dayjs().second()
  // proto.second = function(input) {
  //   return this.$g(input, '$s', 'second')  --> this.$s
  // }
})

// 7、定义Dayjs的静态方法
dayjs.extend = (plugin, option) => { // 显然插件是一个函数
  if (!plugin.$i) { // install plugin only once
    plugin(option, Dayjs, dayjs) // plugin => fn
    plugin.$i = true // 此时增加$i属性
  }
  return dayjs
}
dayjs.locale = parseLocale
dayjs.isDayjs = isDayjs
dayjs.unix = timestamp => (
  dayjs(timestamp * 1e3)
)
dayjs.en = Ls[L]
dayjs.Ls = Ls
dayjs.p = {}

export default dayjs
